/**
 * Contratos del catálogo de PIÙ.
 * Son independientes de la fuente de datos: hoy se llenan con datos locales
 * y en el futuro pueden venir de Firestore sin cambiar los componentes.
 */

import type { ImageVariants } from "@/lib/catalog/photos"

type Category = {
  id: string
  slug: string
  name: string
  description?: string
  sortOrder: number
  isVisible: boolean
}

type ProductAvailability = "available" | "unavailable"

type Product = {
  id: string
  categoryId: string
  name: string
  description: string
  /** Precio en pesos chilenos, entero. */
  priceClp: number
  /** Ruta local o URL de la fotografía. Si falta, `ProductImage` usa la ilustración PIÙ. */
  imageUrl?: string | null
  /** La misma foto en 360 y 900 px. Si falta, se usa solo `imageUrl`. */
  imageVariants?: ImageVariants | null
  availability: ProductAvailability
  isFeatured: boolean
  sortOrder: number
}

type AdminCategory = {
  id: string
  slug: string
  name: string
  description: string | null
  sortOrder: number
  isVisible: boolean
}

type AdminProduct = {
  id: string
  categoryId: string
  name: string
  description: string
  priceClp: number
  imageUrl: string | null
  availability: ProductAvailability
  isFeatured: boolean
  isVisible: boolean
  sortOrder: number
}

export type { AdminCategory, AdminProduct, Category, Product, ProductAvailability }
