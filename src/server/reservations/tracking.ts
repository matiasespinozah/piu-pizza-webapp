import "server-only"

import { createHash } from "node:crypto"
import { Timestamp, type Firestore } from "firebase-admin/firestore"

import type { StaffSession } from "@/lib/auth/roles"
import { collections } from "@/lib/firebase/model"
import { ReservationError } from "@/lib/reservations/errors"
import { todayIsoInSantiago } from "@/lib/reservations/schedule"
import {
  createTrackingSecret,
  hashTrackingSecret,
  trackingExpired,
  trackingExpiresOn,
  trackingLimits,
  unwrapTrackingSecret,
  wrapTrackingSecret,
} from "@/lib/reservations/tracking"
import { parseTrackingCredential, publicReservationStatus, type PublicReservationStatus } from "@/lib/reservations/tracking-link"
import type { ReservationTrackingState } from "@/lib/reservations/views"
import { reservationStatusEnabled, reservationWritesEnabled } from "@/lib/reservations/writes"
import { assertStaff } from "@/server/auth/authorization"
import { getDb } from "@/server/firebase/firestore"

const notFound = () => new ReservationError(404, "not_found", "No encontramos una solicitud con ese enlace.")

function statusRateId(kind: "token" | "fail", material: string, now: Date) {
  const hour = now.toISOString().slice(0, 13)
  return createHash("sha256").update(`${hour}|${kind}|${material}`).digest("hex").slice(0, 24)
}

async function consumeBudget(db: Firestore, id: string, limit: number) {
  const ref = db.collection(collections.reservationStatusRate).doc(id)
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const used = Number(snap.data()?.count ?? 0)
    if (used >= limit) {
      throw new ReservationError(429, "rate", "Espera un momento antes de consultar de nuevo.")
    }
    tx.set(ref, { count: used + 1 }, { merge: true })
  })
}

function plainReservation(data: Record<string, unknown>) {
  const updatedAt = data.updatedAt
  let updated: string | null = null
  if (updatedAt instanceof Timestamp) updated = updatedAt.toDate().toISOString()
  else if (typeof updatedAt === "string") updated = updatedAt
  return publicReservationStatus({ ...data, updatedAt: updated })
}

async function readTrackingState(db: Firestore, data: Record<string, unknown>): Promise<ReservationTrackingState> {
  const trackingId = typeof data.trackingId === "string" ? data.trackingId : ""
  if (!trackingId) return { state: "missing" }
  const snap = await db.collection(collections.reservationAccess).doc(trackingId).get()
  if (!snap.exists) return { state: "missing" }
  const expiresOn = typeof snap.get("expiresOn") === "string" ? snap.get("expiresOn") : null
  if (snap.get("revokedAt")) return { state: "revoked", expiresOn }
  if (!expiresOn || trackingExpired(expiresOn)) return { state: "expired", expiresOn }
  return { state: "active", expiresOn }
}

async function readPublicStatus(credential: string, address: string, now = new Date()): Promise<PublicReservationStatus> {
  if (!reservationStatusEnabled()) {
    throw new ReservationError(503, "disabled", "El seguimiento en línea todavía no está disponible.")
  }
  const parsed = parseTrackingCredential(credential)
  const db = getDb()
  if (parsed.kind === "malformed") {
    await consumeBudget(db, statusRateId("fail", address, now), trackingLimits.failuresPerAddressPerHour)
    throw new ReservationError(400, "invalid", "Pega el enlace completo de seguimiento.")
  }
  if (parsed.kind === "reference") {
    await consumeBudget(db, statusRateId("fail", address, now), trackingLimits.failuresPerAddressPerHour)
    throw notFound()
  }

  const trackingId = hashTrackingSecret(parsed.token)
  await consumeBudget(db, statusRateId("token", trackingId, now), trackingLimits.checksPerTokenPerHour)
  const access = await db.collection(collections.reservationAccess).doc(trackingId).get()
  const expiresOn = access.get("expiresOn")
  const reservationId = access.get("reservationId")
  const usable =
    access.exists &&
    access.get("revokedAt") == null &&
    typeof expiresOn === "string" &&
    !trackingExpired(expiresOn, now) &&
    typeof reservationId === "string"
  if (!usable) {
    await consumeBudget(db, statusRateId("fail", address, now), trackingLimits.failuresPerAddressPerHour)
    throw notFound()
  }

  const reservation = await db.collection(collections.reservations).doc(reservationId).get()
  const status = reservation.exists ? plainReservation(reservation.data() ?? {}) : null
  if (!status) {
    await consumeBudget(db, statusRateId("fail", address, now), trackingLimits.failuresPerAddressPerHour)
    throw notFound()
  }
  return status
}

function assertReservationId(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ReservationError(404, "missing", "No encontramos esa solicitud.")
}

async function issueReservationTracking(session: StaffSession | null, id: string, revision: number, now = new Date()) {
  if (!reservationWritesEnabled()) {
    throw new ReservationError(503, "disabled", "Las reservas en línea no están disponibles.")
  }
  const actor = assertStaff(session, ["superadmin", "admin"])
  assertReservationId(id)
  const db = getDb()
  const ref = db.collection(collections.reservations).doc(id)
  const token = createTrackingSecret()
  const trackingId = hashTrackingSecret(token)
  const wrapped = wrapTrackingSecret(token, id)
  const stamp = Timestamp.fromDate(now)

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) throw new ReservationError(404, "missing", "No encontramos esa solicitud.")
    const data = snap.data() ?? {}
    if (data.revision !== revision) {
      throw new ReservationError(409, "conflict", "Otra persona ya actualizó esta solicitud.")
    }
    const previous = typeof data.trackingId === "string" ? data.trackingId : ""
    const previousRef = previous ? db.collection(collections.reservationAccess).doc(previous) : null
    const previousSnap = previousRef ? await tx.get(previousRef) : null
    const visit = typeof data.date === "string" ? data.date : todayIsoInSantiago(now)
    const expiresOn = trackingExpiresOn(visit)
    if (previousRef && previousSnap?.exists) tx.update(previousRef, { revokedAt: stamp })
    tx.set(db.collection(collections.reservationAccess).doc(trackingId), {
      reservationId: id,
      expiresOn,
      revokedAt: null,
      wrapped,
      createdAt: stamp,
    })
    tx.update(ref, {
      trackingId,
      revision: revision + 1,
      updatedAt: stamp,
      lastModifiedBy: actor.uid,
    })
    tx.set(ref.collection("events").doc(), {
      action: "tracking_issued",
      fromStatus: data.status ?? null,
      toStatus: data.status ?? "pending",
      actorUid: actor.uid,
      at: stamp,
      reason: null,
    })
  })

  return token
}

async function revokeReservationTracking(session: StaffSession | null, id: string, revision: number, now = new Date()) {
  if (!reservationWritesEnabled()) {
    throw new ReservationError(503, "disabled", "Las reservas en línea no están disponibles.")
  }
  const actor = assertStaff(session, ["superadmin", "admin"])
  assertReservationId(id)
  const db = getDb()
  const ref = db.collection(collections.reservations).doc(id)
  const stamp = Timestamp.fromDate(now)

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) throw new ReservationError(404, "missing", "No encontramos esa solicitud.")
    const data = snap.data() ?? {}
    if (data.revision !== revision) {
      throw new ReservationError(409, "conflict", "Otra persona ya actualizó esta solicitud.")
    }
    const trackingId = typeof data.trackingId === "string" ? data.trackingId : ""
    if (!trackingId) throw new ReservationError(409, "missing", "Esta solicitud no tiene un enlace para revocar.")
    const accessRef = db.collection(collections.reservationAccess).doc(trackingId)
    const access = await tx.get(accessRef)
    if (!access.exists) throw new ReservationError(409, "missing", "Esta solicitud no tiene un enlace para revocar.")
    tx.update(accessRef, { revokedAt: stamp })
    tx.update(ref, { revision: revision + 1, updatedAt: stamp, lastModifiedBy: actor.uid })
    tx.set(ref.collection("events").doc(), {
      action: "tracking_revoked",
      fromStatus: data.status ?? null,
      toStatus: data.status ?? "pending",
      actorUid: actor.uid,
      at: stamp,
      reason: null,
    })
  })
}

function recoverTrackingToken(wrapped: unknown, revokedAt: unknown, idempotencyKey: string) {
  if (revokedAt != null || typeof wrapped !== "string") return null
  return unwrapTrackingSecret(wrapped, idempotencyKey)
}

export {
  issueReservationTracking,
  readPublicStatus,
  readTrackingState,
  recoverTrackingToken,
  revokeReservationTracking,
}
