import "server-only"

import { categorySchema, collections, productSchema } from "@/lib/firebase/model"
import { assertFirebaseDataEnabled } from "@/server/firebase/guard"
import { getDb } from "@/server/firebase/firestore"

const pageSize = 100

type CategoryRecord = ReturnType<typeof categorySchema.parse> & { id: string }
type ProductRecord = ReturnType<typeof productSchema.parse> & { id: string }

/**
 * Borrador del catálogo en Firestore. `/carta` sigue leyendo los datos locales.
 * Estas funciones no se llaman desde ninguna página de este hito.
 */
async function listVisibleCategories(): Promise<CategoryRecord[]> {
  assertFirebaseDataEnabled()
  const snap = await getDb()
    .collection(collections.categories)
    .where("isVisible", "==", true)
    .orderBy("sortOrder")
    .limit(pageSize)
    .get()

  return snap.docs.flatMap((item) => {
    const parsed = categorySchema.safeParse(item.data())
    return parsed.success ? [{ id: item.id, ...parsed.data }] : []
  })
}

async function listVisibleProducts(): Promise<ProductRecord[]> {
  assertFirebaseDataEnabled()
  const snap = await getDb()
    .collection(collections.products)
    .where("isVisible", "==", true)
    .orderBy("sortOrder")
    .limit(pageSize)
    .get()

  return snap.docs.flatMap((item) => {
    const parsed = productSchema.safeParse(item.data())
    return parsed.success ? [{ id: item.id, ...parsed.data }] : []
  })
}

export { listVisibleCategories, listVisibleProducts }
