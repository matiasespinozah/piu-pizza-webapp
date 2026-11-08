import "server-only"

import { randomUUID } from "node:crypto"

import { getStorage } from "firebase-admin/storage"
import { z } from "zod"

import type { StaffSession } from "@/lib/auth/roles"
import { catalogSlug } from "@/lib/catalog/slug"
import { isCatalogPhotoUrl } from "@/lib/catalog/photos"
import { categorySchema, collections, productSchema } from "@/lib/firebase/model"
import { assertStaff } from "@/server/auth/authorization"
import { CatalogImageError, prepareProductImage } from "@/server/catalog/images"
import { firebaseDataAccessEnabled } from "@/lib/firebase/access"
import { assertFirebaseDataEnabled } from "@/server/firebase/guard"
import { getAdminApp } from "@/server/firebase/admin"
import { getDb } from "@/server/firebase/firestore"

const catalogRoles = ["superadmin", "admin"] as const
const pageSize = 200

class CatalogError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "CatalogError"
    this.status = status
  }
}

const categoryInput = z
  .object({
    id: z.string().trim().min(1).max(80).optional(),
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(280).nullable().optional(),
    sortOrder: z.number().int().min(0).max(999),
    isVisible: z.boolean(),
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
  const db = getDb()
  const [categories, products] = await Promise.all([
    db.collection(collections.categories).orderBy("sortOrder").limit(pageSize).get(),
    db.collection(collections.products).orderBy("sortOrder").limit(pageSize).get(),
  ])

  return {
    categories: categories.docs.flatMap((item) => {
      const parsed = categorySchema.safeParse(item.data())
      return parsed.success ? [{ id: item.id, ...parsed.data }] : []
    }),
    products: products.docs.flatMap((item) => {
      const parsed = productSchema.safeParse(item.data())
      return parsed.success ? [{ id: item.id, ...parsed.data }] : []
    }),
  }
}

async function saveCategory(session: StaffSession | null, input: unknown) {
  assertStaff(session, catalogRoles)
  assertFirebaseDataEnabled()
  const data = parse(categoryInput, input)
  const id = data.id || catalogSlug(data.name)
  if (!id) throw new CatalogError(400, "La categoría necesita un nombre.")
  const description = data.description?.trim() ? data.description.trim() : null
  await getDb().collection(collections.categories).doc(id).set({
    slug: id,
    name: data.name,
    description,
    sortOrder: data.sortOrder,
    isVisible: data.isVisible,
  })
  return { id }
}

async function deleteCategory(session: StaffSession | null, id: string) {
  assertStaff(session, catalogRoles)
  assertFirebaseDataEnabled()
  const db = getDb()
  const products = await db.collection(collections.products).where("categoryId", "==", id).limit(1).get()
  if (!products.empty) throw new CatalogError(409, "Esa categoría todavía tiene productos. Muévelos o elimínalos antes.")
  await db.collection(collections.categories).doc(id).delete()
}

async function saveProduct(session: StaffSession | null, input: unknown) {
  assertStaff(session, catalogRoles)
  assertFirebaseDataEnabled()
  const data = parse(productInput, input)
  const db = getDb()
  const category = await db.collection(collections.categories).doc(data.categoryId).get()
  if (!category.exists) throw new CatalogError(400, "Esa categoría no existe.")

  const id = data.id || randomUUID()
  const ref = db.collection(collections.products).doc(id)
  const current = data.id ? await ref.get() : null
  if (data.id && !current?.exists) throw new CatalogError(404, "Ese producto no está en la carta.")
  const imageUrl = current?.get("imageUrl")
  const record = productSchema.parse({
    categoryId: data.categoryId,
    name: data.name,
    description: data.description,
    priceClp: data.priceClp,
    imageUrl: typeof imageUrl === "string" ? imageUrl : null,
    availability: data.availability,
    isFeatured: data.isFeatured,
    isVisible: data.isVisible,
    sortOrder: data.sortOrder,
  })
  await ref.set(record)
  return { id }
}

async function deleteProduct(session: StaffSession | null, id: string) {
  assertStaff(session, catalogRoles)
  assertFirebaseDataEnabled()
  const ref = getDb().collection(collections.products).doc(id)
  const current = await ref.get()
  if (!current.exists) throw new CatalogError(404, "Ese producto no está en la carta.")
  await ref.delete()
  await deleteStoredPhotos(id)
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
  const token = randomUUID()
  await bucket.file(path).save(prepared.bytes, {
    contentType: "image/webp",
    metadata: {
      cacheControl: "public, max-age=31536000, immutable",
      metadata: { firebaseStorageDownloadTokens: token },
    },
  })

  const imageUrl = photoUrl(bucketName, path, token)
  if (!isCatalogPhotoUrl(imageUrl)) throw new CatalogError(500, "No se pudo publicar la foto.")
  await ref.set({ imageUrl }, { merge: true })
  await deleteStoredPhotos(id, path)
  return { imageUrl }
}

function photoUrl(bucketName: string, path: string, token: string) {
  const encoded = encodeURIComponent(path)
  const emulator = process.env.FIREBASE_STORAGE_EMULATOR_HOST
  if (emulator) return `http://${emulator}/v0/b/${bucketName}/o/${encoded}?alt=media&token=${token}`
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encoded}?alt=media&token=${token}`
}

async function deleteStoredPhotos(productId: string, keep?: string) {
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  if (!bucketName) return
  const bucket = getStorage(getAdminApp()).bucket(bucketName)
  const [files] = await bucket.getFiles({ prefix: `products/${productId}/` })
  await Promise.all(files.filter((file) => file.name !== keep).map((file) => file.delete().catch(() => undefined)))
}

export {
  CatalogError,
  countCatalogProducts,
  deleteCategory,
  deleteProduct,
  listCatalogForStaff,
  readCatalogEditor,
  replaceProductPhoto,
  saveCategory,
  saveProduct,
}
