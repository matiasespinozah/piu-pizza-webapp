import { localCategories, localProducts } from "@/lib/catalog/data"
import type { Category, Product } from "@/lib/catalog/types"

/**
 * Contrato de acceso al catálogo. Los componentes dependen de esta interfaz,
 * no de dónde viven los datos.
 */
type CatalogDataSource = {
  getCategories(): Promise<Category[]>
  getProducts(): Promise<Product[]>
  getProductsByCategory(categoryId: string): Promise<Product[]>
}

function bySortOrder<T extends { sortOrder: number }>(a: T, b: T) {
  return a.sortOrder - b.sortOrder
}

/** Implementación local: datos en memoria, sin red ni credenciales. */
const localCatalogDataSource: CatalogDataSource = {
  async getCategories() {
    return localCategories.filter((category) => category.isVisible).toSorted(bySortOrder)
  },
  async getProducts() {
    return localProducts.toSorted(bySortOrder)
  },
  async getProductsByCategory(categoryId) {
    return localProducts.filter((product) => product.categoryId === categoryId).toSorted(bySortOrder)
  },
}

/**
 * Punto único de intercambio: ver `docs/arquitectura/catalogo.md` para
 * conectar Firestore en una fase posterior sin tocar los componentes.
 */
const catalogDataSource: CatalogDataSource = localCatalogDataSource

export { catalogDataSource, localCatalogDataSource }
export type { CatalogDataSource }
