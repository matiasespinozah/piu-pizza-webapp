import "server-only"

import { cacheLife, cacheTag } from "next/cache"

import { catalogCacheLife } from "@/lib/catalog/public-cache"
import { firebaseDataAccessEnabled } from "@/lib/firebase/access"
import { collections, settingsDocId } from "@/lib/firebase/model"
import { defaultOperationRules, readOperationRules } from "@/lib/reservations/operations"
import { hoursLines, type HoursLine } from "@/lib/reservations/schedule"
import { getDb } from "@/server/firebase/firestore"

/** Una lectura del documento de configuración, cacheada como la carta. */
async function readCachedOpeningHours(): Promise<HoursLine[]> {
  "use cache"
  cacheLife(catalogCacheLife)
  cacheTag("operations")

  const snap = await getDb().collection(collections.restaurantSettings).doc(settingsDocId).get()
  const rules = readOperationRules(snap.data()) ?? defaultOperationRules()
  return hoursLines(rules.week)
}

async function getPublicOpeningHours() {
  if (!firebaseDataAccessEnabled()) return hoursLines(defaultOperationRules().week)
  return readCachedOpeningHours()
}

export { getPublicOpeningHours }
export type { HoursLine }
