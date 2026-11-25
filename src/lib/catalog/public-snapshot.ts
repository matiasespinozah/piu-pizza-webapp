import { z } from "zod"

import { categorySchema, productSchema } from "@/lib/firebase/model"
import { readImageVariants, type ImageVariants } from "@/lib/catalog/photos"
import type { Product } from "@/lib/catalog/types"

/** Límite de un documento de Firestore, en bytes. */
const firestoreDocumentLimit = 1_048_576
/** Margen bajo el límite: el cálculo es el JSON, y Firestore suma los nombres de los campos. */
const publicCatalogByteBudget = 900_000

type SourceCategory = {
  id: string
  slug: string
  name: string
  description: string | null
  sortOrder: number
  isVisible: boolean
}

type SourceProduct = {
  id: string
  categoryId: string
  name: string
  description: string
  priceClp: number
  imageUrl: string | null
  imageVariants?: ImageVariants | null
  availability: Product["availability"]
  isFeatured: boolean
  isVisible: boolean
  sortOrder: number
}

type PublicCategory = {
  id: string
  slug: string
  name: string
  description: string | null
  sortOrder: number
}

type PublicProduct = {
  id: string
  categoryId: string
  name: string
  description: string
  priceClp: number
  imageUrl: string | null
  /** Solo si el producto las tiene. */
  imageVariants?: ImageVariants | null
  availability: Product["availability"]
  isFeatured: boolean
  sortOrder: number
}

type PublicCatalog = {
  categories: PublicCategory[]
  products: PublicProduct[]
}

const publicCatalogSchema = z.object({
  categories: z.array(
    z.object({
      id: z.string().trim().min(1).max(80),
      slug: z.string().trim().min(1).max(80),
      name: z.string().trim().min(1).max(80),
      description: z.string().trim().max(280).nullable(),
      sortOrder: z.number().int(),
    }),
  ),
  products: z.array(
    z.object({
      id: z.string().trim().min(1).max(80),
      categoryId: z.string().trim().min(1).max(80),
      name: z.string().trim().min(1).max(80),
      description: z.string().trim().max(500),
      priceClp: z.number().int().nonnegative(),
      imageUrl: z.string().trim().min(1).nullable(),
      // Un snapshot anterior no la trae; un valor malo se ignora en vez de invalidar la carta.
      imageVariants: z.unknown().optional().transform((value) => readImageVariants(value) ?? undefined),
      availability: z.enum(["available", "unavailable"]),
      isFeatured: z.boolean(),
      sortOrder: z.number().int(),
    }),
  ),
})

class PublicCatalogTooLargeError extends Error {
  readonly bytes: number

  constructor(bytes: number) {
    super(`La carta pública pesa ${bytes} bytes y no cabe con margen en un documento. No se guardó el cambio.`)
    this.name = "PublicCatalogTooLargeError"
    this.bytes = bytes
  }
}

function sortCategories(categories: PublicCategory[]) {
  return categories.toSorted((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "es"))
}

function sortProducts(products: PublicProduct[]) {
  return products.toSorted((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "es"))
}

/** Arma la carta que ven los clientes. Omite ocultos y no copia datos de administración. */
function projectPublicCatalog(categories: readonly SourceCategory[], products: readonly SourceProduct[]): PublicCatalog {
  return {
    categories: sortCategories(
      categories
        .filter((category) => category.isVisible)
        .map((category) => ({
          id: category.id,
          slug: category.slug,
          name: category.name,
          description: category.description,
          sortOrder: category.sortOrder,
        })),
    ),
    products: sortProducts(
      products
        .filter((product) => product.isVisible)
        .map((product) => ({
          id: product.id,
          categoryId: product.categoryId,
          name: product.name,
          description: product.description,
          priceClp: product.priceClp,
          imageUrl: product.imageUrl,
          ...(product.imageVariants ? { imageVariants: product.imageVariants } : {}),
          availability: product.availability,
          isFeatured: product.isFeatured,
          sortOrder: product.sortOrder,
        })),
    ),
  }
}

function publicCatalogBytes(catalog: PublicCatalog) {
  return new TextEncoder().encode(JSON.stringify(catalog)).byteLength
}

function assertPublicCatalogFits(catalog: PublicCatalog) {
  const bytes = publicCatalogBytes(catalog)
  if (bytes > publicCatalogByteBudget) throw new PublicCatalogTooLargeError(bytes)
  return bytes
}

function parseSourceCategory(id: string, data: unknown): SourceCategory | null {
  const parsed = categorySchema.safeParse(data)
  if (!parsed.success) return null
  return { id, ...parsed.data }
}

function parseSourceProduct(id: string, data: unknown): SourceProduct | null {
  const parsed = productSchema.safeParse(data)
  if (!parsed.success) return null
  return { id, ...parsed.data }
}

function uniqueByName(products: readonly PublicProduct[]) {
  const seen = new Set<string>()
  const unique: PublicProduct[] = []
  for (const product of sortProducts([...products])) {
    const name = product.name.trim().toLocaleLowerCase("es-CL")
    if (seen.has(product.id) || seen.has(name)) continue
    seen.add(product.id)
    seen.add(name)
    unique.push(product)
  }
  return unique
}

/** Las tres sugerencias salen de la misma carta pública: chef o destacados, sin repetir nombre. */
function publicSuggestions(products: readonly PublicProduct[], chefCategoryId: string) {
  return uniqueByName(products.filter((product) => product.categoryId === chefCategoryId || product.isFeatured)).slice(0, 3)
}

export {
  assertPublicCatalogFits,
  firestoreDocumentLimit,
  parseSourceCategory,
  parseSourceProduct,
  projectPublicCatalog,
  publicCatalogByteBudget,
  publicCatalogBytes,
  publicCatalogSchema,
  PublicCatalogTooLargeError,
  publicSuggestions,
}
export type { PublicCatalog, PublicCategory, PublicProduct, SourceCategory, SourceProduct }
