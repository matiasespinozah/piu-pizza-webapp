import "server-only"

import { type Query, type QueryDocumentSnapshot } from "firebase-admin/firestore"

const catalogPageSize = 200
const catalogReadCap = 2000

/** Lee una colección de a 200, con tope, para no quedarse en la primera página. */
async function readEvery(query: Query) {
  const docs: QueryDocumentSnapshot[] = []
  let cursor: QueryDocumentSnapshot | null = null
  while (docs.length < catalogReadCap) {
    let page = query.limit(catalogPageSize)
    if (cursor) page = page.startAfter(cursor)
    const snap = await page.get()
    docs.push(...snap.docs)
    if (snap.size < catalogPageSize) break
    const last = snap.docs[snap.docs.length - 1]
    if (!last) break
    cursor = last
  }
  return docs
}

export { catalogPageSize, catalogReadCap, readEvery }
