import "server-only"

import { FieldValue } from "firebase-admin/firestore"

import { firebaseDataAccessEnabled } from "@/lib/firebase/access"
import { collections } from "@/lib/firebase/model"
import type { CartaVisit } from "@/lib/metrics/carta-visit"
import { todayIsoInSantiago } from "@/lib/reservations/schedule"
import { getDb } from "@/server/firebase/firestore"

type CartaDay = {
  day: string
  ready: boolean
  opens: number
  engagedSeconds: number
}

function dayRef(day: string) {
  return getDb().collection(collections.metricsCarta).doc(day)
}

/** Una sola escritura al documento del día. Si Firestore está apagado, no hace nada. */
async function recordCartaVisit(visit: CartaVisit, now = new Date()) {
  if (!firebaseDataAccessEnabled()) return
  const day = todayIsoInSantiago(now)
  const patch =
    visit.kind === "open"
      ? { opens: FieldValue.increment(1) }
      : { engagedSeconds: FieldValue.increment(visit.seconds) }
  await dayRef(day).set(patch, { merge: true })
}

/** Una lectura del documento de hoy. */
async function readCartaVisits(now = new Date()): Promise<CartaDay> {
  const day = todayIsoInSantiago(now)
  if (!firebaseDataAccessEnabled()) return { day, ready: false, opens: 0, engagedSeconds: 0 }
  const snap = await dayRef(day).get()
  const data = snap.data()
  return {
    day,
    ready: true,
    opens: typeof data?.opens === "number" && data.opens > 0 ? data.opens : 0,
    engagedSeconds: typeof data?.engagedSeconds === "number" && data.engagedSeconds > 0 ? data.engagedSeconds : 0,
  }
}

export { readCartaVisits, recordCartaVisit }
export type { CartaDay }
