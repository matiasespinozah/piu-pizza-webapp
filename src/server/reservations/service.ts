import "server-only"

import { createHash, randomBytes } from "node:crypto"
import { Timestamp, type Firestore, type Query } from "firebase-admin/firestore"

import type { StaffSession } from "@/lib/auth/roles"
import { firebaseDataAccessEnabled } from "@/lib/firebase/access"
import { collections, settingsDocId } from "@/lib/firebase/model"
import { planAssignment, readCapacity, type HoldBooking } from "@/lib/reservations/capacity"
import { admitStored, limitsStored, quotaReason, readDayOverride } from "@/lib/reservations/day-policy"
import { ReservationError } from "@/lib/reservations/errors"
import type { PublicReservationInput } from "@/lib/reservations/public-request"
import { todayIsoInSantiago } from "@/lib/reservations/schedule"
import { canTransition, nextStatus, type StaffAction } from "@/lib/reservations/transitions"
import type { ReservationStatus, ReservationZone } from "@/lib/reservations/types"
import { createTrackingSecret, hashTrackingSecret, trackingExpiresOn, wrapTrackingSecret } from "@/lib/reservations/tracking"
import { normalizeChileMobile, validateTime } from "@/lib/reservations/validation"
import type {
  PublicReceipt,
  ReservationDetail,
  ReservationEvent,
  ReservationListItem,
  ReservationSummary,
} from "@/lib/reservations/views"
import { reservationWritesEnabled } from "@/lib/reservations/writes"
import { assertStaff } from "@/server/auth/authorization"
import { getDb } from "@/server/firebase/firestore"
import { readTrackingState, recoverTrackingToken } from "@/server/reservations/tracking"

const pageSize = 20
const rateLimitPerHour = 8
const statuses = new Set<ReservationStatus>([
  "pending",
  "confirmed",
  "rejected",
  "reschedule_requested",
  "cancelled",
  "arrived",
  "completed",
])

type ListQuery = {
  date?: string
  status?: string
  zone?: string
  view?: string
  q?: string
  cursor?: string
}

type ReservationData = Record<string, unknown>

function assertWritable() {
  if (!reservationWritesEnabled()) {
    throw new ReservationError(503, "disabled", "Las reservas en línea no están disponibles.")
  }
}

function referenceCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  return `PIU-${[...randomBytes(8)].map((byte) => alphabet[byte % alphabet.length]).join("")}`
}

function fingerprint(input: PublicReservationInput) {
  const phone = normalizeChileMobile(input.customerPhone) ?? ""
  return createHash("sha256")
    .update(
      [input.date, input.preferredTime, String(input.partySize), input.preferredZone, phone, input.customerName.trim().toLocaleLowerCase("es-CL"), input.notes.trim()].join("|")
    )
    .digest("hex")
}

function rateDocId(ip: string, now: Date) {
  const hour = now.toISOString().slice(0, 13)
  return createHash("sha256").update(`${hour}|${ip}`).digest("hex").slice(0, 24)
}

function iso(value: unknown) {
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "string") return value
  return ""
}

function text(value: unknown) {
  return typeof value === "string" ? value : ""
}

function asStatus(value: unknown): ReservationStatus | null {
  return typeof value === "string" && statuses.has(value as ReservationStatus) ? (value as ReservationStatus) : null
}

function asZone(value: unknown): ReservationZone | null {
  return value === "salon" || value === "terrace" ? value : null
}

function bookingsOf(data: ReservationData | undefined) {
  const raw = data?.bookings
  if (!raw || typeof raw !== "object") return {} as Record<string, HoldBooking>
  return raw as Record<string, HoldBooking>
}

function receiptOf(data: ReservationData): PublicReceipt {
  const zone = asZone(data.preferredZone) ?? "salon"
  return {
    referenceCode: text(data.referenceCode),
    status: "pending",
    date: text(data.date),
    preferredTime: text(data.preferredTime),
    partySize: Number(data.partySize),
    preferredZone: zone,
  }
}

function listItem(id: string, data: ReservationData): ReservationListItem | null {
  const status = asStatus(data.status)
  const zone = asZone(data.preferredZone)
  if (!status || !zone || typeof data.revision !== "number") return null
  return {
    id,
    referenceCode: text(data.referenceCode),
    status,
    date: text(data.date),
    preferredTime: text(data.preferredTime),
    partySize: Number(data.partySize),
    preferredZone: zone,
    customerName: text(data.customerName),
    createdAt: iso(data.createdAt),
    revision: data.revision,
  }
}

function capacityMessage(reason: string) {
  if (reason === "insufficient") return "No hay mesas suficientes para ese grupo en la zona."
  if (reason === "blocked") return "Las mesas de esa zona están bloqueadas."
  if (reason === "unreservable") return "Las mesas de esa zona no están habilitadas para reservas. La solicitud sigue pendiente."
  if (reason === "overlap") return "Ese horario ya tiene las mesas ocupadas."
  if (reason === "zone") return "No hay mesas configuradas para esa zona."
  if (reason === "manual") return "El grupo es más grande que una mesa conocida. Queda pendiente para asignarlo a mano."
  if (reason === "daily") return "Ese día ya alcanzó el tope de reservas confirmadas. La solicitud sigue pendiente."
  if (reason === "slot") return "Ese horario ya alcanzó el tope de reservas. La solicitud sigue pendiente."
  return "Falta la configuración real de mesas. La solicitud sigue pendiente."
}

async function countOf(query: Query): Promise<number | null> {
  try {
    const snap = await query.count().get()
    return snap.data().count
  } catch {
    return null
  }
}

async function loadSummary(db: Firestore): Promise<ReservationSummary> {
  const today = todayIsoInSantiago()
  const base = db.collection(collections.reservations)
  const pending = await countOf(base.where("status", "==", "pending"))
  const changes = await countOf(base.where("status", "==", "reschedule_requested"))
  const confirmedToday = await countOf(base.where("status", "==", "confirmed").where("date", "==", today))
  const upcoming = await countOf(base.where("status", "==", "confirmed").where("date", ">=", today))
  return {
    pending,
    confirmedToday,
    upcoming,
    attention: pending == null || changes == null ? null : pending + changes,
  }
}

async function reservationSummary(session: StaffSession | null) {
  assertStaff(session, ["superadmin", "admin"])
  if (!reservationWritesEnabled()) return { ready: false as const, summary: null }
  return { ready: true as const, summary: await loadSummary(getDb()) }
}

async function createPublicReservation(input: PublicReservationInput, ip: string, now = new Date()) {
  assertWritable()
  const phone = normalizeChileMobile(input.customerPhone)
  if (!phone) throw new ReservationError(422, "invalid", "Ingresa un celular chileno, por ejemplo +56 9 2887 3619.")

  const db = getDb()
  const ref = db.collection(collections.reservations).doc(input.idempotencyKey)
  const rateRef = db.collection(collections.reservationRate).doc(rateDocId(ip, now))
  const stamp = Timestamp.fromDate(now)
  const mark = fingerprint(input)
  const freshToken = createTrackingSecret()
  const freshId = hashTrackingSecret(freshToken)
  const wrapped = wrapTrackingSecret(freshToken, input.idempotencyKey)
  const expiresOn = trackingExpiresOn(input.date)

  const settingsRef = db.collection(collections.restaurantSettings).doc(settingsDocId)
  const dayRef = db.collection(collections.reservationDays).doc(input.date)

  const outcome = await db.runTransaction(async (tx) => {
    const current = await tx.get(ref)
    if (current.exists) {
      const data = current.data() ?? {}
      if (data.fingerprint !== mark) {
        throw new ReservationError(409, "idempotency", "Esa solicitud ya se envió con otros datos.")
      }
      const trackingId = typeof data.trackingId === "string" ? data.trackingId : ""
      const access = trackingId ? await tx.get(db.collection(collections.reservationAccess).doc(trackingId)) : null
      return {
        duplicate: true,
        data,
        trackingToken: recoverTrackingToken(access?.get("wrapped"), access?.get("revokedAt"), input.idempotencyKey),
      }
    }

    const settingsSnap = await tx.get(settingsRef)
    const daySnap = await tx.get(dayRef)
    const admission = admitStored(settingsSnap.data(), daySnap.exists ? daySnap.data() : null, input.date)
    if (!admission.ok) throw new ReservationError(422, admission.code, admission.message)

    const rate = await tx.get(rateRef)
    const used = Number(rate.data()?.count ?? 0)
    if (used >= rateLimitPerHour) {
      throw new ReservationError(429, "rate", "Recibimos demasiadas solicitudes. Inténtalo más tarde.")
    }

    const data = {
      referenceCode: referenceCode(),
      status: "pending",
      date: input.date,
      preferredTime: input.preferredTime,
      partySize: input.partySize,
      preferredZone: input.preferredZone,
      customerName: input.customerName,
      customerNameKey: input.customerName.toLocaleLowerCase("es-CL"),
      customerPhone: phone,
      notes: input.notes,
      createdAt: stamp,
      updatedAt: stamp,
      revision: 1,
      createdSource: "web",
      assignedTableIds: [],
      holdDate: null,
      holdZone: null,
      confirmedBy: null,
      lastModifiedBy: null,
      proposedDate: null,
      proposedTime: null,
      proposedZone: null,
      rejectionReason: null,
      confirmedAt: null,
      cancelledAt: null,
      fingerprint: mark,
      trackingId: freshId,
    }
    tx.set(ref, data)
    tx.set(db.collection(collections.reservationAccess).doc(freshId), {
      reservationId: input.idempotencyKey,
      expiresOn,
      revokedAt: null,
      wrapped,
      createdAt: stamp,
    })
    tx.set(rateRef, { count: used + 1 }, { merge: true })
    tx.set(ref.collection("events").doc(), {
      action: "received",
      fromStatus: null,
      toStatus: "pending",
      actorUid: null,
      at: stamp,
      reason: null,
    })
    return { duplicate: false, data, trackingToken: freshToken }
  })

  return { duplicate: outcome.duplicate, receipt: receiptOf(outcome.data), trackingToken: outcome.trackingToken }
}

function listQuery(db: Firestore, query: ListQuery) {
  const ref: Query = db.collection(collections.reservations)
  const q = query.q?.trim() ?? ""
  const today = todayIsoInSantiago()
  if (q.startsWith("PIU-")) return ref.where("referenceCode", "==", q.toUpperCase())
  if (q) {
    const name = q.toLocaleLowerCase("es-CL")
    return ref.where("customerNameKey", ">=", name).where("customerNameKey", "<=", `${name}\uf8ff`).orderBy("customerNameKey")
  }
  if (query.view === "pending" || query.status === "pending") {
    return ref.where("status", "==", "pending").orderBy("createdAt", "desc")
  }
  if (query.view === "upcoming") {
    return ref.where("status", "==", "confirmed").where("date", ">=", today).orderBy("date")
  }
  if (query.view === "today") return ref.where("date", "==", today).orderBy("createdAt", "desc")
  if (asStatus(query.status) && query.date) {
    return ref.where("status", "==", query.status).where("date", "==", query.date).orderBy("createdAt", "desc")
  }
  if (asStatus(query.status)) return ref.where("status", "==", query.status).orderBy("createdAt", "desc")
  if (query.date && asZone(query.zone)) {
    return ref.where("date", "==", query.date).where("preferredZone", "==", query.zone).orderBy("createdAt", "desc")
  }
  if (query.date) return ref.where("date", "==", query.date).orderBy("createdAt", "desc")
  if (asZone(query.zone)) return ref.where("preferredZone", "==", query.zone).orderBy("createdAt", "desc")
  return ref.orderBy("createdAt", "desc")
}

async function listReservationsForStaff(session: StaffSession | null, query: ListQuery) {
  assertStaff(session, ["superadmin", "admin"])
  if (!firebaseDataAccessEnabled()) {
    return { ready: false as const, items: [] as ReservationListItem[], nextCursor: null, summary: null }
  }

  const db = getDb()
  const summary = await loadSummary(db)
  if (query.view === "attention") {
    const pending = await db.collection(collections.reservations).where("status", "==", "pending").orderBy("createdAt", "desc").limit(pageSize).get()
    const changes = await db.collection(collections.reservations).where("status", "==", "reschedule_requested").orderBy("createdAt", "desc").limit(pageSize).get()
    const items = [...pending.docs, ...changes.docs]
      .map((item) => listItem(item.id, item.data()))
      .filter((item): item is ReservationListItem => item != null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, pageSize)
    return { ready: true as const, items, nextCursor: null, summary }
  }

  let built = listQuery(db, query)
  const searchable = !query.q?.trim()
  if (query.cursor && searchable) {
    const cursor = await db.collection(collections.reservations).doc(query.cursor).get()
    if (cursor.exists) built = built.startAfter(cursor)
  }
  const snap = await built.limit(pageSize + 1).get()
  const docs = snap.docs.slice(0, pageSize)
  const items = docs.map((item) => listItem(item.id, item.data())).filter((item): item is ReservationListItem => item != null)
  const nextCursor = snap.docs.length > pageSize ? docs.at(-1)?.id ?? null : null
  return { ready: true as const, items, nextCursor, summary }
}

async function getReservationForStaff(session: StaffSession | null, id: string): Promise<ReservationDetail> {
  assertStaff(session, ["superadmin", "admin"])
  if (!firebaseDataAccessEnabled()) {
    throw new ReservationError(503, "disabled", "Las reservas en línea no están disponibles.")
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ReservationError(404, "missing", "No encontramos esa solicitud.")

  const db = getDb()
  const ref = db.collection(collections.reservations).doc(id)
  const snap = await ref.get()
  if (!snap.exists) throw new ReservationError(404, "missing", "No encontramos esa solicitud.")
  const data = snap.data() ?? {}
  const item = listItem(snap.id, data)
  if (!item) throw new ReservationError(404, "missing", "No encontramos esa solicitud.")

  const eventsSnap = await ref.collection("events").orderBy("at", "desc").limit(20).get()
  const events: ReservationEvent[] = eventsSnap.docs.map((event) => {
    const body = event.data()
    return {
      action: text(body.action),
      fromStatus: asStatus(body.fromStatus),
      toStatus: asStatus(body.toStatus) ?? item.status,
      actorUid: typeof body.actorUid === "string" ? body.actorUid : null,
      at: iso(body.at),
      reason: typeof body.reason === "string" ? body.reason : null,
    }
  })

  return {
    ...item,
    customerPhone: text(data.customerPhone),
    notes: text(data.notes),
    assignedTableIds: Array.isArray(data.assignedTableIds) ? data.assignedTableIds.filter((id) => typeof id === "string") : [],
    proposedDate: typeof data.proposedDate === "string" ? data.proposedDate : null,
    proposedTime: typeof data.proposedTime === "string" ? data.proposedTime : null,
    proposedZone: asZone(data.proposedZone),
    updatedAt: iso(data.updatedAt),
    events,
    tracking: await readTrackingState(db, data),
  }
}

type TransitionInput = {
  id: string
  action: StaffAction
  revision: number
  reason?: string
  proposedDate?: string
  proposedTime?: string
  proposedZone?: ReservationZone
}

async function transitionReservation(session: StaffSession | null, input: TransitionInput, now = new Date()) {
  assertWritable()
  const actor = assertStaff(session, ["superadmin", "admin"])
  const reason = input.reason?.trim() ?? ""
  if (reason.length > 160) throw new ReservationError(422, "invalid", "El motivo es demasiado largo.")

  const db = getDb()
  const ref = db.collection(collections.reservations).doc(input.id)
  const settingsRef = db.collection(collections.restaurantSettings).doc(settingsDocId)
  const stamp = Timestamp.fromDate(now)

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) throw new ReservationError(404, "missing", "No encontramos esa solicitud.")
    const data = snap.data() ?? {}
    const status = asStatus(data.status)
    if (!status || data.revision !== input.revision) {
      throw new ReservationError(409, "conflict", "Otra persona ya actualizó esta solicitud.")
    }
    if (!canTransition(status, input.action)) {
      throw new ReservationError(409, "invalid_transition", "Esa solicitud ya no admite ese cambio.")
    }

    const to = nextStatus[input.action]
    const patch: ReservationData = {
      status: to,
      updatedAt: stamp,
      revision: input.revision + 1,
      lastModifiedBy: actor.uid,
    }

    if (input.action === "propose") {
      const zone = input.proposedZone
      if (!input.proposedDate || !input.proposedTime || !zone) {
        throw new ReservationError(422, "invalid", "Indica la fecha, la hora y la zona propuestas.")
      }
      const errors = validateTime(
        {
          date: input.proposedDate,
          partySize: Number(data.partySize),
          zone,
          preferredTime: input.proposedTime,
          customerName: "ok",
          customerPhone: "",
          notes: "",
        },
        now
      )
      if (Object.keys(errors).length > 0) {
        throw new ReservationError(422, "invalid", Object.values(errors)[0] ?? "Ese horario no está disponible.")
      }
      patch.proposedDate = input.proposedDate
      patch.proposedTime = input.proposedTime
      patch.proposedZone = zone
      if (reason) patch.rejectionReason = reason
    }

    if (input.action === "reject" || input.action === "cancel") {
      patch.rejectionReason = reason || null
      if (input.action === "cancel") patch.cancelledAt = stamp
    }

    const releases = input.action === "cancel" || input.action === "complete"
    const confirms = input.action === "confirm"
    const oldDate = typeof data.holdDate === "string" ? data.holdDate : ""
    const oldZone = asZone(data.holdZone)
    let targetDate = text(data.date)
    let targetTime = text(data.preferredTime)
    let targetZone = asZone(data.preferredZone)
    if (confirms && status === "reschedule_requested" && data.proposedDate && data.proposedTime && asZone(data.proposedZone)) {
      targetDate = text(data.proposedDate)
      targetTime = text(data.proposedTime)
      targetZone = asZone(data.proposedZone)
    }

    const oldRef = oldDate && oldZone ? db.collection(collections.reservationHolds).doc(`${oldDate}_${oldZone}`) : null
    const newRef = confirms && targetZone ? db.collection(collections.reservationHolds).doc(`${targetDate}_${targetZone}`) : null
    const otherRef =
      confirms && targetZone
        ? db.collection(collections.reservationHolds).doc(`${targetDate}_${targetZone === "salon" ? "terrace" : "salon"}`)
        : null
    const dayRef = confirms ? db.collection(collections.reservationDays).doc(targetDate) : null
    const settingsSnap = confirms ? await tx.get(settingsRef) : null
    const oldSnap = oldRef && (releases || confirms) ? await tx.get(oldRef) : null
    const newSnap = newRef && (!oldRef || newRef.path !== oldRef.path) ? await tx.get(newRef) : oldSnap
    const otherSnap = otherRef ? await tx.get(otherRef) : null
    const daySnap = dayRef ? await tx.get(dayRef) : null
    const trackingId = typeof data.trackingId === "string" ? data.trackingId : ""
    const accessRef = trackingId ? db.collection(collections.reservationAccess).doc(trackingId) : null
    const accessSnap = accessRef ? await tx.get(accessRef) : null

    if (confirms && (!targetZone || !newRef)) {
      throw new ReservationError(409, "capacity_unconfigured", capacityMessage("unconfigured"))
    }

    if (confirms && targetZone && newRef) {
      const config = readCapacity(settingsSnap?.data(), { allowFixture: Boolean(process.env.FIRESTORE_EMULATOR_HOST) })
      const bookings = { ...bookingsOf(newSnap?.data()) }
      if (oldRef && newRef && oldRef.path === newRef.path) delete bookings[input.id]
      const [hours, minutes] = targetTime.split(":").map(Number)
      const plan = planAssignment({
        config,
        bookings,
        zone: targetZone,
        partySize: Number(data.partySize),
        startMin: hours * 60 + minutes,
      })
      if (!plan.ok) throw new ReservationError(409, `capacity_${plan.reason}`, capacityMessage(plan.reason))
      const startMin = hours * 60 + minutes
      const day = readDayOverride(daySnap?.exists ? daySnap.data() : null, targetDate)
      if (daySnap?.exists && !day) {
        throw new ReservationError(409, "capacity_unconfigured", "La excepción de ese día no se pudo leer. La solicitud sigue pendiente.")
      }
      const limits = limitsStored(settingsSnap?.data(), day)
      const counted = [
        ...Object.values(bookings),
        ...Object.entries(bookingsOf(otherSnap?.data()))
          .filter(([id]) => id !== input.id)
          .map((entry) => entry[1]),
      ]
      const quota = quotaReason(counted, startMin, limits.daily, limits.slot)
      if (quota) throw new ReservationError(409, `capacity_${quota}`, capacityMessage(quota))
      const nextBookings = { ...bookingsOf(newSnap?.data()) }
      if (oldRef && newRef && oldRef.path !== newRef.path) {
        const previous = { ...bookingsOf(oldSnap?.data()) }
        delete previous[input.id]
        tx.set(oldRef, { bookings: previous }, { merge: true })
      }
      nextBookings[input.id] = {
        tableIds: plan.tableIds,
        slots: plan.slots ?? Math.max(1, plan.tableIds.length),
        startMin: hours * 60 + minutes,
        endMin: plan.endMin,
        zone: targetZone,
      }
      tx.set(newRef, { bookings: nextBookings }, { merge: true })
      patch.assignedTableIds = plan.tableIds
      patch.holdDate = targetDate
      patch.holdZone = targetZone
      patch.confirmedBy = actor.uid
      patch.confirmedAt = stamp
      patch.date = targetDate
      patch.preferredTime = targetTime
      patch.preferredZone = targetZone
    }

    if (releases && oldRef) {
      const previous = { ...bookingsOf(oldSnap?.data()) }
      delete previous[input.id]
      tx.set(oldRef, { bookings: previous }, { merge: true })
      patch.assignedTableIds = []
      patch.holdDate = null
      patch.holdZone = null
    }

    if (confirms && accessRef && accessSnap?.exists) {
      tx.update(accessRef, { expiresOn: trackingExpiresOn(targetDate) })
    }

    tx.update(ref, patch)
    tx.set(ref.collection("events").doc(), {
      action: input.action,
      fromStatus: status,
      toStatus: to,
      actorUid: actor.uid,
      at: stamp,
      reason: reason || null,
    })
  })
}

export {
  createPublicReservation,
  getReservationForStaff,
  listReservationsForStaff,
  rateLimitPerHour,
  reservationSummary,
  transitionReservation,
}
export type { ListQuery, TransitionInput }
