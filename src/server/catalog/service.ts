import "server-only"

import { randomUUID } from "node:crypto"

import { FieldPath } from "firebase-admin/firestore"
import { getStorage } from "firebase-admin/storage"
import { z } from "zod"

import type { StaffSession } from "@/lib/auth/roles"
import { duplicateCategoryMessage, newCategoryId } from "@/lib/catalog/slug"
import { isCatalogPhotoUrl, photosToDelete, readImageVariants, type ImageVariants } from "@/lib/catalog/photos"
import { categorySchema, collections, productSchema } from "@/lib/firebase/model"
import { assertStaff } from "@/server/auth/authorization"
import { CatalogImageError, prepareProductImage, prepareProductVariants } from "@/server/catalog/images"
import { firebaseDataAccessEnabled } from "@/lib/firebase/access"
import { assertFirebaseDataEnabled } from "@/server/firebase/guard"
import { getAdminApp } from "@/server/firebase/admin"
import { CatalogError } from "@/server/catalog/errors"
import { readEvery } from "@/server/catalog/pages"
import { commitCatalogMutation, ensurePublicCatalog } from "@/server/catalog/publish"
import { getDb } from "@/server/firebase/firestore"

const catalogRoles = ["superadmin", "admin"] as const

const categoryInput = z
  .object({
    id: z.string().trim().min(1).max(80).optional(),
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(280).nullable().optional(),
    sortOrder: z.number().int().min(0).max(999),
    isVisible: z.boolean(),
  })
  .strict()

const reorderInput = z
  .object({
    moves: z
      .array(
        z
          .object({
            id: z.string().trim().min(1).max(80),
            sortOrder: z.number().int().min(0).max(999),
          })
          .strict(),
      )
      .min(1)
      .max(80),
  })
  .strict()

const productInput = z
  .object({
    id: z.string().trim().min(1).max(80).optional(),
    categoryId: z.string().trim().min(1).max(80),
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(500),
    priceClp: z.number().int().nonnegative().max(1_000_000),
    availability: z.enum(["available", "unavailable"]),
    isVisible: z.boolean(),
    isFeatured: z.boolean(),
    sortOrder: z.number().int().min(0).max(999),
  })
  .strict()

function parse<T>(schema: z.ZodType<T>, input: unknown) {
  const parsed = schema.safeParse(input)
  if (!parsed.success) throw new CatalogError(400, "Revisa los datos. Hay un campo vacío o un precio que no es un entero.")
  return parsed.data
}

async function countCatalogProducts(session: StaffSession | null) {
  assertStaff(session, catalogRoles)
  if (!firebaseDataAccessEnabled()) return null
  const snap = await getDb().collection(collections.products).count().get()
  return snap.data().count
}

async function readCatalogEditor(session: StaffSession | null) {
  assertStaff(session, catalogRoles)
  if (!firebaseDataAccessEnabled()) return null
  return listCatalogForStaff(session)
}

async function listCatalogForStaff(session: StaffSession | null) {
  assertStaff(session, catalogRoles)
  assertFirebaseDataEnabled()
  await ensurePublicCatalog()
  const db = getDb()
  const [categories, products] = await Promise.all([
    readEvery(db.collection(collections.categories).orderBy(FieldPath.documentId())),
    readEvery(db.collection(collections.products).orderBy(FieldPath.documentId())),
  ])

  return {
    categories: categories.flatMap((item) => {
      const parsed = categorySchema.safeParse(item.data())
      return parsed.success ? [{ id: item.id, ...parsed.data }] : []
    }),
    products: products.flatMap((item) => {
      const parsed = productSchema.safeParse(item.data())
      return parsed.success ? [{ id: item.id, ...parsed.data }] : []
    }),
  }
}

async function saveCategory(session: StaffSession | null, input: unknown) {
  assertStaff(session, catalogRoles)
  assertFirebaseDataEnabled()
  const data = parse(categoryInput, input)
  const description = data.description?.trim() ? data.description.trim() : null
  const saved = await commitCatalogMutation((state) => {
    const existingIds = state.categories.map((category) => category.id)
    let id = data.id
    if (!id) {
      const created = newCategoryId(data.name, existingIds)
      if (!created.ok) throw new CatalogError(created.status, created.message)
      id = created.id
    }
    const sameName = state.categories.some(
      (category) =>
        category.id !== id && category.name.localeCompare(data.name, "es", { sensitivity: "accent" }) === 0,
    )
    if (sameName) throw new CatalogError(409, duplicateCategoryMessage)
    const record = {
      slug: id,
      name: data.name,
      description,
      sortOrder: data.sortOrder,
      isVisible: data.isVisible,
    }
    const next = { id, ...record }
    const categories = existingIds.includes(id)
      ? state.categories.map((category) => (category.id === id ? next : category))
      : [...state.categories, next]
    return {
      state: { ...state, categories },
      apply(tx) {
        tx.set(getDb().collection(collections.categories).doc(id), record)
      },
      result: { id },
    }
  })
  return saved
}

async function reorderCategories(session: StaffSession | null, input: unknown) {
  assertStaff(session, catalogRoles)
  assertFirebaseDataEnabled()
  const data = parse(reorderInput, input)
  const ids = data.moves.map((move) => move.id)
  if (new Set(ids).size !== ids.length) throw new CatalogError(400, "Hay categorías repetidas en el orden.")
  await commitCatalogMutation((state) => {
    const byId = new Map(state.categories.map((category) => [category.id, category]))
    for (const move of data.moves) {
      if (!byId.has(move.id)) throw new CatalogError(404, "Esa categoría no está en la carta.")
    }
    const order = new Map(data.moves.map((move) => [move.id, move.sortOrder]))
    return {
      state: {
        ...state,
        categories: state.categories.map((category) => {
          const sortOrder = order.get(category.id)
          return sortOrder === undefined ? category : { ...category, sortOrder }
        }),
      },
      apply(tx) {
        const categories = getDb().collection(collections.categories)
        for (const move of data.moves) tx.update(categories.doc(move.id), { sortOrder: move.sortOrder })
      },
    }
  })
}

async function deleteCategory(session: StaffSession | null, id: string) {
  assertStaff(session, catalogRoles)
  assertFirebaseDataEnabled()
  await commitCatalogMutation((state) => {
    if (!state.categories.some((category) => category.id === id)) {
      throw new CatalogError(404, "Esa categoría no está en la carta.")
    }
    if (state.products.some((product) => product.categoryId === id)) {
      throw new CatalogError(409, "Esa categoría todavía tiene productos. Muévelos o elimínalos antes.")
    }
    return {
      state: { ...state, categories: state.categories.filter((category) => category.id !== id) },
      apply(tx) {
        tx.delete(getDb().collection(collections.categories).doc(id))
      },
    }
  })
}

async function saveProduct(session: StaffSession | null, input: unknown) {
  assertStaff(session, catalogRoles)
  assertFirebaseDataEnabled()
  const data = parse(productInput, input)
  const id = data.id || randomUUID()
  const fields = productSchema.omit({ imageUrl: true, imageVariants: true }).parse({
    categoryId: data.categoryId,
    name: data.name,
    description: data.description,
    priceClp: data.priceClp,
    availability: data.availability,
    isFeatured: data.isFeatured,
    isVisible: data.isVisible,
    sortOrder: data.sortOrder,
  })
  await commitCatalogMutation((state) => {
    if (!state.categories.some((category) => category.id === data.categoryId)) {
      throw new CatalogError(400, "Esa categoría no existe.")
    }
    const current = state.products.find((product) => product.id === id)
    if (data.id && !current) throw new CatalogError(404, "Ese producto no está en la carta.")
    const next = { id, ...fields, imageUrl: current?.imageUrl ?? null, imageVariants: current?.imageVariants ?? null }
    const products = current
      ? state.products.map((product) => (product.id === id ? next : product))
      : [...state.products, next]
    return {
      state: { ...state, products },
      apply(tx) {
        tx.set(getDb().collection(collections.products).doc(id), {
          categoryId: next.categoryId,
          name: next.name,
          description: next.description,
          priceClp: next.priceClp,
          imageUrl: next.imageUrl,
          // Al editar nombre o precio se conservan las versiones chicas de la foto.
          imageVariants: next.imageVariants,
          availability: next.availability,
          isFeatured: next.isFeatured,
          isVisible: next.isVisible,
          sortOrder: next.sortOrder,
        })
      },
    }
  })
  return { id }
}

async function deleteProduct(session: StaffSession | null, id: string) {
  assertStaff(session, catalogRoles)
  assertFirebaseDataEnabled()
  await commitCatalogMutation((state) => {
    if (!state.products.some((product) => product.id === id)) {
      throw new CatalogError(404, "Ese producto no está en la carta.")
    }
    return {
      state: { ...state, products: state.products.filter((product) => product.id !== id) },
      apply(tx) {
        tx.delete(getDb().collection(collections.products).doc(id))
      },
    }
  })
  await deleteStoredPhotos(id)
}

/**
 * Publica la foto principal y sus versiones chicas juntas. Sin versiones (`null`) se borran las anteriores:
 * ya no corresponden a la foto nueva.
 */
async function publishProductImage(
  session: StaffSession | null,
  id: string,
  imageUrl: string,
  imageVariants: ImageVariants | null = null,
) {
  assertStaff(session, catalogRoles)
  assertFirebaseDataEnabled()
  if (!isCatalogPhotoUrl(imageUrl)) throw new CatalogError(500, "No se pudo publicar la foto.")
  if (imageVariants && !(isCatalogPhotoUrl(imageVariants.thumb) && isCatalogPhotoUrl(imageVariants.medium))) {
    throw new CatalogError(500, "No se pudo publicar la foto.")
  }
  await commitCatalogMutation((state) => {
    const current = state.products.find((product) => product.id === id)
    if (!current) throw new CatalogError(404, "Ese producto no está en la carta.")
    const next = { ...current, imageUrl, imageVariants }
    return {
      state: { ...state, products: state.products.map((product) => (product.id === id ? next : product)) },
      apply(tx) {
        tx.update(getDb().collection(collections.products).doc(id), { imageUrl, imageVariants })
      },
    }
  })
}

type PhotoBucket = ReturnType<ReturnType<typeof getStorage>["bucket"]>

/** Sube un archivo de foto con caché larga y devuelve su URL pública con token. */
async function storePhotoFile(bucket: PhotoBucket, bucketName: string, path: string, bytes: Buffer) {
  const token = randomUUID()
  await bucket.file(path).save(bytes, {
    contentType: "image/webp",
    metadata: {
      cacheControl: "public, max-age=31536000, immutable",
      metadata: { firebaseStorageDownloadTokens: token },
    },
  })
  return photoUrl(bucketName, path, token)
}

function variantPaths(mainPath: string) {
  const base = mainPath.replace(/\.webp$/, "")
  return { medium: `${base}-900.webp`, thumb: `${base}-360.webp` }
}

/**
 * Sube las dos versiones chicas de una foto. Si algo falla, devuelve null y borra lo que alcanzó a subir:
 * la foto principal se publica igual y el sitio la usa sola, como antes.
 */
async function storePhotoVariants(bucket: PhotoBucket, bucketName: string, mainPath: string, mainBytes: Buffer) {
  const paths = variantPaths(mainPath)
  try {
    const made = await prepareProductVariants(mainBytes)
    const [thumb, medium] = await Promise.all([
      storePhotoFile(bucket, bucketName, paths.thumb, made.thumb),
      storePhotoFile(bucket, bucketName, paths.medium, made.medium),
    ])
    const variants: ImageVariants = { thumb, medium }
    if (!isCatalogPhotoUrl(thumb) || !isCatalogPhotoUrl(medium)) throw new Error("url")
    return { variants, paths }
  } catch {
    await Promise.all([bucket.file(paths.thumb).delete(), bucket.file(paths.medium).delete()].map((job) => job.catch(() => undefined)))
    return null
  }
}

async function replaceProductPhoto(session: StaffSession | null, id: string, file: Buffer) {
  assertStaff(session, catalogRoles)
  assertFirebaseDataEnabled()
  const ref = getDb().collection(collections.products).doc(id)
  const current = await ref.get()
  if (!current.exists) throw new CatalogError(404, "Ese producto no está en la carta.")

  let prepared: { bytes: Buffer; hash: string }
  try {
    prepared = await prepareProductImage(file)
  } catch (error) {
    if (error instanceof CatalogImageError) throw new CatalogError(400, error.message)
    throw error
  }

  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  if (!bucketName) throw new CatalogError(503, "Storage no está configurado en este entorno.")

  const path = `products/${id}/${prepared.hash}.webp`
  const bucket = getStorage(getAdminApp()).bucket(bucketName)
  const imageUrl = await storePhotoFile(bucket, bucketName, path, prepared.bytes)
  const stored = bucket.file(path)
  if (!isCatalogPhotoUrl(imageUrl)) {
    await stored.delete().catch(() => undefined)
    throw new CatalogError(500, "No se pudo publicar la foto.")
  }
  const made = await storePhotoVariants(bucket, bucketName, path, prepared.bytes)
  try {
    await publishProductImage(session, id, imageUrl, made?.variants ?? null)
  } catch (error) {
    await Promise.all(
      [stored, ...(made ? [bucket.file(made.paths.thumb), bucket.file(made.paths.medium)] : [])].map((item) =>
        item.delete().catch(() => undefined),
      ),
    )
    throw error
  }
  const fresh = await ref.get()
  if (fresh.get("imageUrl") === imageUrl) await deleteStoredPhotos(id, made ? [path, made.paths.thumb, made.paths.medium] : [path])
  return { imageUrl }
}

/** Nombre del archivo en Storage a partir de la URL de descarga de una foto del catálogo. */
function storagePathOf(photo: string) {
  try {
    const marker = "/o/"
    const url = new URL(photo)
    const at = url.pathname.indexOf(marker)
    return at === -1 ? null : decodeURIComponent(url.pathname.slice(at + marker.length))
  } catch {
    return null
  }
}

/**
 * Agrega las versiones chicas a un producto que ya tiene foto, sin cambiar la foto principal ni su URL.
 * Lo usa el script de migración. No toca nada si el producto no tiene foto o ya tiene versiones.
 */
async function addProductPhotoVariants(session: StaffSession | null, id: string) {
  assertStaff(session, catalogRoles)
  assertFirebaseDataEnabled()
  const snap = await getDb().collection(collections.products).doc(id).get()
  if (!snap.exists) return "missing" as const
  const imageUrl = snap.get("imageUrl")
  if (typeof imageUrl !== "string" || !isCatalogPhotoUrl(imageUrl)) return "no-photo" as const
  if (readImageVariants(snap.get("imageVariants"))) return "already" as const

  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  if (!bucketName) throw new CatalogError(503, "Storage no está configurado en este entorno.")
  const path = storagePathOf(imageUrl)
  if (!path || !path.startsWith(`products/${id}/`)) return "no-photo" as const

  const bucket = getStorage(getAdminApp()).bucket(bucketName)
  const [main] = await bucket.file(path).download()
  const made = await storePhotoVariants(bucket, bucketName, path, main)
  if (!made) return "failed" as const
  try {
    await publishProductImage(session, id, imageUrl, made.variants)
  } catch (error) {
    await Promise.all([bucket.file(made.paths.thumb).delete(), bucket.file(made.paths.medium).delete()].map((job) => job.catch(() => undefined)))
    throw error
  }
  return "done" as const
}

function photoUrl(bucketName: string, path: string, token: string) {
  const encoded = encodeURIComponent(path)
  const emulator = process.env.FIREBASE_STORAGE_EMULATOR_HOST
  if (emulator) return `http://${emulator}/v0/b/${bucketName}/o/${encoded}?alt=media&token=${token}`
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encoded}?alt=media&token=${token}`
}

async function deleteStoredPhotos(productId: string, keep?: string | readonly string[]) {
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  if (!bucketName) return
  const bucket = getStorage(getAdminApp()).bucket(bucketName)
  const [files] = await bucket.getFiles({ prefix: `products/${productId}/` })
  const stale = new Set(photosToDelete(files.map((file) => file.name), productId, keep))
  await Promise.all(files.filter((file) => stale.has(file.name)).map((file) => file.delete().catch(() => undefined)))
}

export {
  addProductPhotoVariants,
  CatalogError,
  countCatalogProducts,
  deleteCategory,
  deleteProduct,
  listCatalogForStaff,
  publishProductImage,
  readCatalogEditor,
  reorderCategories,
  replaceProductPhoto,
  saveCategory,
  saveProduct,
}
