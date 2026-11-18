import "server-only"

import { FieldPath } from "firebase-admin/firestore"
import { cacheLife, cacheTag } from "next/cache"

import { CHEF_CATEGORY_ID, localCategories, localProducts } from "@/lib/catalog/data"
import { catalogCacheLife } from "@/lib/catalog/public-cache"
import {
  parseSourceCategory,
  parseSourceProduct,
  projectPublicCatalog,
  publicCatalogSchema,
  publicSuggestions,
  type PublicCatalog,
} from "@/lib/catalog/public-snapshot"
import type { Category, Product } from "@/lib/catalog/types"
import { firebaseDataAccessEnabled } from "@/lib/firebase/access"
import { collections, publicCatalogDocId } from "@/lib/firebase/model"
import { readEvery } from "@/server/catalog/pages"
import { getDb } from "@/server/firebase/firestore"

function toMenu(catalog: PublicCatalog): { categories: Category[]; products: Product[] } {
  return {
    categories: catalog.categories.map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description ?? undefined,
      sortOrder: category.sortOrder,
      isVisible: true,
    })),
    products: catalog.products.map((product) => ({
      id: product.id,
      categoryId: product.categoryId,
      name: product.name,
      description: product.description,
      priceClp: product.priceClp,
      imageUrl: product.imageUrl,
      availability: product.availability,
      isFeatured: product.isFeatured,
      sortOrder: product.sortOrder,
    })),
  }
}

async function readSourceProjection(): Promise<PublicCatalog> {
  const db = getDb()
  const [categories, products] = await Promise.all([
    readEvery(db.collection(collections.categories).orderBy(FieldPath.documentId())),
    readEvery(db.collection(collections.products).orderBy(FieldPath.documentId())),
  ])
  return projectPublicCatalog(
    categories.flatMap((item) => {
      const category = parseSourceCategory(item.id, item.data())
      return category ? [category] : []
    }),
    products.flatMap((item) => {
      const product = parseSourceProduct(item.id, item.data())
      return product ? [product] : []
    }),
  )
}

/** Una sola lectura: el documento publicado. Si todavía no existe, arma la carta sin escribir. */
async function readPublishedCatalog(): Promise<PublicCatalog> {
  "use cache"
  cacheLife(catalogCacheLife)
  cacheTag("catalog")

  const snap = await getDb().collection(collections.catalog).doc(publicCatalogDocId).get()
  const parsed = publicCatalogSchema.safeParse(snap.data())
  if (snap.exists && parsed.success) return parsed.data
  return readSourceProjection()
}

/** Con Firestore apagado, Home y /carta siguen con el catálogo local. */
async function getPublicCatalog() {
  if (!firebaseDataAccessEnabled()) {
    return {
      categories: localCategories.filter((category) => category.isVisible).toSorted((a, b) => a.sortOrder - b.sortOrder),
      products: [...localProducts].toSorted((a, b) => a.sortOrder - b.sortOrder),
    }
  }
  return toMenu(await readPublishedCatalog())
}

async function getChefSuggestions() {
  if (!firebaseDataAccessEnabled()) {
    return publicSuggestions(
      localProducts
        .filter((product) => product.categoryId === CHEF_CATEGORY_ID)
        .map((product) => ({ ...product, imageUrl: product.imageUrl ?? null })),
      CHEF_CATEGORY_ID,
    )
  }
  const published = await readPublishedCatalog()
  return publicSuggestions(published.products, CHEF_CATEGORY_ID)
}

export { getChefSuggestions, getPublicCatalog }
