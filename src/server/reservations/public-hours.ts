import "server-only"

import { cacheLife, cacheTag } from "next/cache"

import { catalogCacheLife } from "@/lib/catalog/public-cache"
import { firebaseDataAccessEnabled } from "@/lib/firebase/access"
import { collections, settingsDocId } from "@/lib/firebase/model"
import { defaultOperationRules, readOperationRules } from "@/lib/reservations/operations"
import { hoursLines, type HoursLine, type WeekSchedule } from "@/lib/reservations/schedule"
import { getDb } from "@/server/firebase/firestore"

/** Una lectura del documento de configuración, cacheada como la carta. */
async function readCachedWeek(): Promise<WeekSchedule> {
  "use cache"
  cacheLife(catalogCacheLife)
  cacheTag("operations")

  const snap = await getDb().collection(collections.restaurantSettings).doc(settingsDocId).get()
  const rules = readOperationRules(snap.data()) ?? defaultOperationRules()
  return rules.week
}

/** La semana que muestra el sitio. Misma lectura cacheada para el pie, las reservas y los datos estructurados. */
async function getPublicWeek(): Promise<WeekSchedule> {
  if (!firebaseDataAccessEnabled()) return defaultOperationRules().week
  return readCachedWeek()
}

async function getPublicOpeningHours() {
  return hoursLines(await getPublicWeek())
}

export { getPublicOpeningHours, getPublicWeek }
export type { HoursLine }
