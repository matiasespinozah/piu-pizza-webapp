import "server-only"

import { FieldPath, type Transaction } from "firebase-admin/firestore"

import {
  assertPublicCatalogFits,
  parseSourceCategory,
  parseSourceProduct,
  projectPublicCatalog,
  PublicCatalogTooLargeError,
  type PublicCatalog,
  type SourceCategory,
  type SourceProduct,
} from "@/lib/catalog/public-snapshot"
import { collections, publicCatalogDocId } from "@/lib/firebase/model"
import { catalogReadCap } from "@/server/catalog/pages"
import { CatalogError } from "@/server/catalog/errors"
import { getDb } from "@/server/firebase/firestore"

type CatalogState = {
  categories: SourceCategory[]
  products: SourceProduct[]
}

function publicRef() {
  return getDb().collection(collections.catalog).doc(publicCatalogDocId)
}

function sourceQueries() {
  const db = getDb()
  return {
    categories: db.collection(collections.categories).orderBy(FieldPath.documentId()).limit(catalogReadCap),
    products: db.collection(collections.products).orderBy(FieldPath.documentId()).limit(catalogReadCap),
  }
}

async function readCatalogState(tx: Transaction): Promise<CatalogState> {
  const queries = sourceQueries()
  const [categories, products] = await Promise.all([tx.get(queries.categories), tx.get(queries.products)])
  if (categories.size >= catalogReadCap || products.size >= catalogReadCap) {
    throw new CatalogError(409, "La carta supera lo que se puede publicar de una vez. No se guardó el cambio.")
  }
  const parsedCategories = categories.docs.map((item) => parseSourceCategory(item.id, item.data()))
  const parsedProducts = products.docs.map((item) => parseSourceProduct(item.id, item.data()))
  if (parsedCategories.some((item) => item === null) || parsedProducts.some((item) => item === null)) {
    throw new CatalogError(500, "Hay un dato de la carta que no se puede publicar. No se guardó el cambio.")
  }
  return {
    categories: parsedCategories.filter((item): item is SourceCategory => item !== null),
    products: parsedProducts.filter((item): item is SourceProduct => item !== null),
  }
}

function writePublicCatalog(tx: Transaction, state: CatalogState) {
  let projected: PublicCatalog
  try {
    projected = projectPublicCatalog(state.categories, state.products)
    assertPublicCatalogFits(projected)
  } catch (error) {
    if (error instanceof PublicCatalogTooLargeError) throw new CatalogError(409, error.message)
    throw error
  }
  tx.set(publicRef(), projected)
}

/**
 * Crea `catalog/public` solo si falta. No modifica productos ni categorías,
 * y no reemplaza una proyección que ya existe.
 */
async function ensurePublicCatalog() {
  const ref = publicRef()
  if ((await ref.get()).exists) return
  await getDb().runTransaction(async (tx) => {
    const current = await tx.get(ref)
    if (current.exists) return
    const state = await readCatalogState(tx)
    writePublicCatalog(tx, state)
  })
}

/** Vuelve a armar la proyección desde los documentos actuales, sin tocarlos. */
async function republishPublicCatalog() {
  await getDb().runTransaction(async (tx) => {
    const state = await readCatalogState(tx)
    writePublicCatalog(tx, state)
  })
}

/**
 * Lee el menú, aplica el cambio y publica la carta en la misma transacción.
 * Si algo falla, Firestore no deja el producto nuevo y la carta vieja.
 */
async function commitCatalogMutation<T = undefined>(
  mutate: (state: CatalogState) => { state: CatalogState; apply: (tx: Transaction) => void; result?: T },
): Promise<T> {
  let result: T | undefined
  await getDb().runTransaction(async (tx) => {
    const current = await readCatalogState(tx)
    const next = mutate(current)
    next.apply(tx)
    writePublicCatalog(tx, next.state)
    result = next.result
  })
  return result as T
}

export { commitCatalogMutation, ensurePublicCatalog, republishPublicCatalog }
export type { CatalogState }
