import "server-only"

import { FieldValue } from "firebase-admin/firestore"

import { firebaseDataAccessEnabled } from "@/lib/firebase/access"
import { collections } from "@/lib/firebase/model"
import type { CartaVisit } from "@/lib/metrics/carta-visit"
import { emptyVisitCounters, type VisitBeacon, type VisitCounters } from "@/lib/metrics/visit"
import { todayIsoInSantiago } from "@/lib/reservations/schedule"
import { getDb } from "@/server/firebase/firestore"

type DayMetrics = VisitCounters & { day: string; ready: boolean }

function dayRef(day: string) {
  return getDb().collection(collections.metricsDays).doc(day)
}

function count(value: unknown) {
  return typeof value === "number" && value > 0 ? value : 0
}

/** Una escritura al documento del día. Si Firestore está apagado, no hace nada. */
async function recordVisit(beacon: VisitBeacon, now = new Date()) {
  if (!firebaseDataAccessEnabled()) return
  const patch: Record<string, FieldValue> =
    beacon.surface === "home"
      ? { homeOpens: FieldValue.increment(1), homeSeconds: FieldValue.increment(beacon.seconds) }
      : beacon.surface === "carta"
        ? { cartaOpens: FieldValue.increment(1), cartaSeconds: FieldValue.increment(beacon.seconds) }
        : {
            reservationOpens: FieldValue.increment(1),
            reservationSeconds: FieldValue.increment(beacon.seconds),
            ...(beacon.reached ? { reservationReached: FieldValue.increment(1) } : {}),
            ...(beacon.savedSeconds
              ? {
                  reservationSavedSeconds: FieldValue.increment(beacon.savedSeconds),
                  reservationSavedSamples: FieldValue.increment(1),
                }
              : {}),
          }
  await dayRef(todayIsoInSantiago(now)).set(patch, { merge: true })
}

/** La carta anterior avisaba la apertura y el tiempo por separado. Sigue sumando en el mismo día. */
async function recordLegacyCartaVisit(visit: CartaVisit, now = new Date()) {
  if (!firebaseDataAccessEnabled()) return
  const patch =
    visit.kind === "open"
      ? { cartaOpens: FieldValue.increment(1) }
      : { cartaSeconds: FieldValue.increment(visit.seconds) }
  await dayRef(todayIsoInSantiago(now)).set(patch, { merge: true })
}

/** Una escritura extra, solo cuando una solicitud pública nueva quedó guardada. */
async function recordReservationSaved(now = new Date()) {
  if (!firebaseDataAccessEnabled()) return
  await dayRef(todayIsoInSantiago(now)).set({ reservationSaved: FieldValue.increment(1) }, { merge: true })
}

/** Una lectura del documento de hoy. */
async function readDayMetrics(now = new Date()): Promise<DayMetrics> {
  const day = todayIsoInSantiago(now)
  if (!firebaseDataAccessEnabled()) return { day, ready: false, ...emptyVisitCounters }
  const data = (await dayRef(day).get()).data()
  return {
    day,
    ready: true,
    homeOpens: count(data?.homeOpens),
    homeSeconds: count(data?.homeSeconds),
    cartaOpens: count(data?.cartaOpens),
    cartaSeconds: count(data?.cartaSeconds),
    reservationOpens: count(data?.reservationOpens),
    reservationSeconds: count(data?.reservationSeconds),
    reservationReached: count(data?.reservationReached),
    reservationSaved: count(data?.reservationSaved),
    reservationSavedSeconds: count(data?.reservationSavedSeconds),
    reservationSavedSamples: count(data?.reservationSavedSamples),
  }
}

export { readDayMetrics, recordLegacyCartaVisit, recordReservationSaved, recordVisit }
export type { DayMetrics }
