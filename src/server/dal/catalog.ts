import "server-only"

import { cacheLife, cacheTag } from "next/cache"

import { CHEF_CATEGORY_ID, localCategories, localProducts } from "@/lib/catalog/data"
import type { Category, Product } from "@/lib/catalog/types"
import { firebaseDataAccessEnabled } from "@/lib/firebase/access"
import { categorySchema, collections, productSchema } from "@/lib/firebase/model"
import { getDb } from "@/server/firebase/firestore"

const pageSize = 200

function uniqueByName(products: Product[]) {
  const seen = new Set<string>()
  const unique: Product[] = []
  for (const product of products.toSorted((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "es"))) {
    const name = product.name.trim().toLocaleLowerCase("es-CL")
    if (seen.has(product.id) || seen.has(name)) continue
    seen.add(product.id)
    seen.add(name)
    unique.push(product)
  }
  return unique
}

function toCategory(id: string, data: unknown): Category | null {
  const parsed = categorySchema.safeParse(data)
  if (!parsed.success) return null
  return {
    id,
    slug: parsed.data.slug,
    name: parsed.data.name,
    description: parsed.data.description ?? undefined,
    sortOrder: parsed.data.sortOrder,
    isVisible: parsed.data.isVisible,
  }
}

function toProduct(id: string, data: unknown): Product | null {
  const parsed = productSchema.safeParse(data)
  if (!parsed.success) return null
  return {
    id,
    categoryId: parsed.data.categoryId,
    name: parsed.data.name,
    description: parsed.data.description,
    priceClp: parsed.data.priceClp,
    imageUrl: parsed.data.imageUrl,
    availability: parsed.data.availability,
    isFeatured: parsed.data.isFeatured,
    sortOrder: parsed.data.sortOrder,
  }
}

async function readPublicCatalog(): Promise<{ categories: Category[]; products: Product[] }> {
  "use cache"
  cacheLife("hours")
  cacheTag("catalog")

  const db = getDb()
  const [categories, products] = await Promise.all([
    db.collection(collections.categories).where("isVisible", "==", true).limit(pageSize).get(),
    db.collection(collections.products).where("isVisible", "==", true).limit(pageSize).get(),
  ])

  return {
    categories: categories.docs
      .flatMap((item) => {
        const category = toCategory(item.id, item.data())
        return category ? [category] : []
      })
      .toSorted((a, b) => a.sortOrder - b.sortOrder),
    products: products.docs
      .flatMap((item) => {
        const product = toProduct(item.id, item.data())
        return product ? [product] : []
      })
      .toSorted((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "es")),
  }
}

async function readChefSuggestions(): Promise<Product[]> {
  "use cache"
  cacheLife("hours")
  cacheTag("catalog")

  const db = getDb()
  const [chef, featured] = await Promise.all([
    db.collection(collections.products).where("categoryId", "==", CHEF_CATEGORY_ID).where("isVisible", "==", true).limit(10).get(),
    db.collection(collections.products).where("isFeatured", "==", true).where("isVisible", "==", true).limit(10).get(),
  ])
  const docs = [...chef.docs, ...featured.docs]
  return uniqueByName(
    docs.flatMap((item) => {
      const product = toProduct(item.id, item.data())
      return product ? [product] : []
    })
  ).slice(0, 3)
}

/** Con Firestore apagado, Home y /carta siguen con el catálogo local. */
async function getPublicCatalog() {
  if (!firebaseDataAccessEnabled()) {
    return {
      categories: localCategories.filter((category) => category.isVisible).toSorted((a, b) => a.sortOrder - b.sortOrder),
      products: [...localProducts].toSorted((a, b) => a.sortOrder - b.sortOrder),
    }
  }
  return readPublicCatalog()
}

async function getChefSuggestions() {
  if (!firebaseDataAccessEnabled()) {
    return uniqueByName(localProducts.filter((product) => product.categoryId === CHEF_CATEGORY_ID)).slice(0, 3)
  }
  return readChefSuggestions()
}

export { getChefSuggestions, getPublicCatalog }
