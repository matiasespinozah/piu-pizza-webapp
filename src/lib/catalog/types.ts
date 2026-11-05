/**
 * Contratos del catálogo de PIÙ.
 * Son independientes de la fuente de datos: hoy se llenan con datos locales
 * y en el futuro pueden venir de Firestore sin cambiar los componentes.
 */

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
  availability: ProductAvailability
  isFeatured: boolean
  sortOrder: number
}

export type { Category, Product, ProductAvailability }
