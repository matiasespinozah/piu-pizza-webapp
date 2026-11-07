import "server-only"

import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { catalogImportAllowed, planCatalogImport } from "@/lib/catalog/import-plan"
import { collections } from "@/lib/firebase/model"
import { getDb } from "@/server/firebase/firestore"

const catalogFile = resolve(process.cwd(), "data/catalog/piu-catalogo-fudo.json")

function textField(current: unknown, incoming: string, overwrite: boolean) {
  if (!overwrite && typeof current === "string") return current
  return incoming
}

class CatalogImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CatalogImportError"
  }
}

/**
 * Carga el menú de Fudo en el proyecto de este proceso.
 * La segunda corrida no crea copias. Nombre, descripción y precio ya guardados
 * se conservan. Solo `PIU_CATALOG_IMPORT_OVERWRITE=on` los reemplaza por el archivo.
 * No corre contra piu-pizza-cl.
 */
async function importFudoCatalog(env: Record<string, string | undefined> = process.env) {
  if (!catalogImportAllowed(env)) {
    throw new CatalogImportError("La importación solo corre en el emulador o en staging. Producción no se toca.")
  }

  const overwrite = env.PIU_CATALOG_IMPORT_OVERWRITE === "on"
  const plan = planCatalogImport(JSON.parse(readFileSync(catalogFile, "utf8")))
  const db = getDb()
  const productRefs = plan.products.map((product) => db.collection(collections.products).doc(product.id))
  const categoryRefs = plan.categories.map((category) => db.collection(collections.categories).doc(category.id))
  const [existingProducts, existingCategories] = await Promise.all([db.getAll(...productRefs), db.getAll(...categoryRefs)])
  const productState = new Map(existingProducts.map((item) => [item.id, item.data()]))
  const categoryState = new Map(existingCategories.map((item) => [item.id, item.data()]))

  const batch = db.batch()
  for (const category of plan.categories) {
    const current = categoryState.get(category.id)
    batch.set(db.collection(collections.categories).doc(category.id), {
      slug: category.slug,
      name: textField(current?.name, category.name, overwrite),
      description: current && !overwrite ? (current.description ?? null) : category.description,
      sortOrder: category.sortOrder,
      isVisible: typeof current?.isVisible === "boolean" ? current.isVisible : category.isVisible,
    })
  }
  for (const product of plan.products) {
    const current = productState.get(product.id)
    batch.set(db.collection(collections.products).doc(product.id), {
      categoryId: product.categoryId,
      name: textField(current?.name, product.name, overwrite),
      description: textField(current?.description, product.description, overwrite),
      priceClp: typeof current?.priceClp === "number" && !overwrite ? current.priceClp : product.priceClp,
      imageUrl: typeof current?.imageUrl === "string" && current.imageUrl ? current.imageUrl : null,
      availability: product.availability,
      isFeatured: typeof current?.isFeatured === "boolean" ? current.isFeatured : product.isFeatured,
      isVisible: typeof current?.isVisible === "boolean" ? current.isVisible : product.isVisible,
      sortOrder: product.sortOrder,
    })
  }
  await batch.commit()

  return { categories: plan.categories.length, products: plan.products.length }
}

export { CatalogImportError, importFudoCatalog }
