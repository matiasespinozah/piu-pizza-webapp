import "server-only"

import { createHash, randomInt, randomUUID } from "node:crypto"
import { FieldPath, FieldValue, Timestamp, type DocumentReference, type Firestore, type Query, type Transaction } from "firebase-admin/firestore"

import type { StaffSession } from "@/lib/auth/roles"
import { firebaseDataAccessEnabled } from "@/lib/firebase/access"
import { collections, settingsDocId } from "@/lib/firebase/model"
import { planAssignment, readCapacity, type HoldBooking } from "@/lib/reservations/capacity"
import { admitStored, limitsStored, quotaReason, readDayOverride } from "@/lib/reservations/day-policy"
import { ReservationError } from "@/lib/reservations/errors"
import type { PublicReservationInput } from "@/lib/reservations/public-request"
import { claimPublicReference } from "@/lib/reservations/reference"
import { optionalReservationEmail, planReservationCreate, storedReservationEmail } from "@/lib/reservations/email"
import { isPastDate, todayIsoInSantiago, toMinutes } from "@/lib/reservations/schedule"
import { eligibleServiceTables, readServiceTables } from "@/lib/reservations/service-tables"
import { pastWindow, staffView } from "@/lib/reservations/staff-views"
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
import { publishReservationNotice } from "@/server/reservations/notifications"

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
  month?: string
  q?: string
  cursor?: string
}

type ReservationData = Record<string, unknown>

function assertWritable() {
  if (!reservationWritesEnabled()) {
    throw new ReservationError(503, "disabled", "Las reservas en línea no están disponibles.")
  }
}

function fingerprint(input: PublicReservationInput) {
  const phone = normalizeChileMobile(input.customerPhone) ?? ""
  return createHash("sha256")
    .update(
      [input.date, input.preferredTime, String(input.partySize), input.preferredZone, phone, input.customerName.trim().toLocaleLowerCase("es-CL"), input.customerEmail, input.marketingOptIn ? "1" : "0", input.notes.trim()].join("|")
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

function releaseHoldBooking(tx: Transaction, ref: DocumentReference, data: ReservationData | undefined, id: string) {
  const previous = { ...bookingsOf(data) }
  delete previous[id]
  tx.set(ref, { bookings: { ...previous, [id]: FieldValue.delete() } }, { merge: true })
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
    customerEmail: storedReservationEmail(data.customerEmail),
    createdAt: iso(data.createdAt),
    revision: data.revision,
  }
}

function capacityMessage(reason: string) {
  if (reason === "insufficient") return "No hay mesas suficientes para ese grupo en la zona."
  if (reason === "blocked") return "Las mesas de esa zona están bloqueadas."
  if (reason === "unreservable") return "Las mesas de esa zona no están habilitadas para reservas. La solicitud sigue pendiente."
  if (reason === "overlap") return "Ese horario ya no tiene cupos libres."
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
  const [pending, changes, confirmedToday, upcoming] = await Promise.all([
    countOf(base.where("status", "==", "pending")),
    countOf(base.where("status", "==", "reschedule_requested")),
    countOf(base.where("status", "==", "confirmed").where("date", "==", today)),
    countOf(base.where("status", "==", "confirmed").where("date", ">=", today)),
  ])
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
      const plan = planReservationCreate(true, data.fingerprint === mark)
      if (plan === "conflict") {
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

    const taken = new Set<string>()
    let referenceCode: string | null = null
    for (let attempt = 0; attempt < 8 && !referenceCode; attempt += 1) {
      const candidate = claimPublicReference(taken, () => randomInt(0, 10000), 1)
      if (!candidate) break
      const existing = await tx.get(db.collection(collections.reservations).where("referenceCode", "==", candidate).limit(1))
      if (existing.empty) referenceCode = candidate
      else taken.add(candidate)
    }
    if (!referenceCode) {
      throw new ReservationError(503, "reference", "No pudimos asignar una referencia. Inténtalo otra vez.")
    }

    const data = {
      referenceCode,
      status: "pending",
      date: input.date,
      preferredTime: input.preferredTime,
      partySize: input.partySize,
      preferredZone: input.preferredZone,
      customerName: input.customerName,
      customerNameKey: input.customerName.toLocaleLowerCase("es-CL"),
      customerPhone: phone,
      customerEmail: input.customerEmail,
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
      ...(input.marketingOptIn
        ? {
            marketingConsent: true,
            marketingConsentAt: stamp,
            marketingConsentSource: "web_reservation",
            marketingConsentVersion: "v1",
          }
        : {}),
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

  if (!outcome.duplicate) {
    await publishReservationNotice({
      action: "received",
      id: input.idempotencyKey,
      referenceCode: text(outcome.data.referenceCode),
      date: input.date,
      time: input.preferredTime,
      zone: input.preferredZone,
      partySize: input.partySize,
      revision: 1,
    }).catch(() => undefined)
  }

  return { duplicate: outcome.duplicate, receipt: receiptOf(outcome.data), trackingToken: outcome.trackingToken }
}

function byVisit(query: Query, direction: "asc" | "desc") {
  return query.orderBy("date", direction).orderBy("preferredTime", direction).orderBy(FieldPath.documentId(), direction)
}

function listQuery(db: Firestore, query: ListQuery) {
  const ref: Query = db.collection(collections.reservations)
  const q = query.q?.trim() ?? ""
  const today = todayIsoInSantiago()
  const view = query.view ? staffView(query.view) : undefined
  if (q.startsWith("PIU-")) return { built: ref.where("referenceCode", "==", q.toUpperCase()), schedule: false }
  if (q) {
    const name = q.toLocaleLowerCase("es-CL")
    return {
      built: ref.where("customerNameKey", ">=", name).where("customerNameKey", "<=", `${name}\uf8ff`).orderBy("customerNameKey"),
      schedule: false,
    }
  }
  if (view === "pending") {
    return { built: ref.where("status", "==", "pending").orderBy("createdAt", "desc"), schedule: false }
  }
  if (view === "upcoming") {
    return { built: ref.where("status", "==", "confirmed").where("date", ">=", today).orderBy("date"), schedule: false }
  }
  if (view === "future") return { built: byVisit(ref.where("date", ">", today), "asc"), schedule: true }
  if (view === "past") {
    const window = pastWindow(query.month, today)
    if (window.empty) return { built: null, schedule: true }
    return { built: byVisit(ref.where("date", ">=", window.from).where("date", "<=", window.to), "desc"), schedule: true }
  }
  if (view === "today" || (!view && !query.status && !query.date && !query.zone)) {
    return {
      built: ref.where("date", "==", today).orderBy("preferredTime", "asc").orderBy(FieldPath.documentId(), "asc"),
      schedule: true,
    }
  }
  if (asStatus(query.status) && query.date) {
    return { built: ref.where("status", "==", query.status).where("date", "==", query.date).orderBy("createdAt", "desc"), schedule: false }
  }
  if (asStatus(query.status)) return { built: ref.where("status", "==", query.status).orderBy("createdAt", "desc"), schedule: false }
  if (query.date && asZone(query.zone)) {
    return { built: ref.where("date", "==", query.date).where("preferredZone", "==", query.zone).orderBy("createdAt", "desc"), schedule: false }
  }
  if (query.date) return { built: ref.where("date", "==", query.date).orderBy("createdAt", "desc"), schedule: false }
  if (asZone(query.zone)) return { built: ref.where("preferredZone", "==", query.zone).orderBy("createdAt", "desc"), schedule: false }
  return { built: ref.orderBy("createdAt", "desc"), schedule: false }
}

function cursorKeepsSchedule(data: ReservationData | undefined) {
  return typeof data?.date === "string" && typeof data.preferredTime === "string" && data.preferredTime.length > 0
}

async function listReservationsForStaff(
  session: StaffSession | null,
  query: ListQuery,
  options: { summary?: boolean } = {},
) {
  assertStaff(session, ["superadmin", "admin"])
  if (!firebaseDataAccessEnabled()) {
    return { ready: false as const, items: [] as ReservationListItem[], nextCursor: null, summary: null }
  }

  const db = getDb()
  const summaryPromise = options.summary === false ? Promise.resolve(null) : loadSummary(db)
  if (query.view === "attention") {
    const [summary, pending, changes] = await Promise.all([
      summaryPromise,
      db.collection(collections.reservations).where("status", "==", "pending").orderBy("createdAt", "desc").limit(pageSize).get(),
      db.collection(collections.reservations).where("status", "==", "reschedule_requested").orderBy("createdAt", "desc").limit(pageSize).get(),
    ])
    const items = [...pending.docs, ...changes.docs]
      .map((item) => listItem(item.id, item.data()))
      .filter((item): item is ReservationListItem => item != null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, pageSize)
    return { ready: true as const, items, nextCursor: null, summary }
  }

  const planned = listQuery(db, query)
  if (!planned.built) {
    const summary = await summaryPromise
    return { ready: true as const, items: [] as ReservationListItem[], nextCursor: null, summary }
  }
  let built = planned.built
  const searchable = !query.q?.trim()
  if (query.cursor && searchable) {
    const cursor = await db.collection(collections.reservations).doc(query.cursor).get()
    const usable = cursor.exists && (!planned.schedule || cursorKeepsSchedule(cursor.data()))
    if (usable) built = built.startAfter(cursor)
  }
  const [summary, snap] = await Promise.all([summaryPromise, built.limit(pageSize + 1).get()])
  const docs = snap.docs.slice(0, pageSize)
  const items = docs.map((item) => listItem(item.id, item.data())).filter((item): item is ReservationListItem => item != null)
  const nextCursor = snap.docs.length > pageSize ? docs.at(-1)?.id ?? null : null
  return { ready: true as const, items, nextCursor, summary }
}

async function listReservationHistory(session: StaffSession | null, cursor?: string) {
  assertStaff(session, ["superadmin", "admin"])
  if (!firebaseDataAccessEnabled()) {
    return { ready: false as const, items: [] as ReservationListItem[], nextCursor: null }
  }
  const db = getDb()
  let built = byVisit(db.collection(collections.reservations), "desc")
  if (cursor) {
    const snap = await db.collection(collections.reservations).doc(cursor).get()
    if (snap.exists && cursorKeepsSchedule(snap.data())) built = built.startAfter(snap)
  }
  const page = await built.limit(pageSize + 1).get()
  const docs = page.docs.slice(0, pageSize)
  const items = docs.map((item) => listItem(item.id, item.data())).filter((item): item is ReservationListItem => item != null)
  const nextCursor = page.docs.length > pageSize ? docs.at(-1)?.id ?? null : null
  return { ready: true as const, items, nextCursor }
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
  const requestCount = item.customerEmail
    ? await countOf(db.collection(collections.reservations).where("customerEmail", "==", item.customerEmail))
    : null

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
    requestCount: requestCount != null && requestCount > 0 ? requestCount : null,
    customerPhone: text(data.customerPhone),
    notes: text(data.notes),
    assignedTableIds: Array.isArray(data.assignedTableIds) ? data.assignedTableIds.filter((id) => typeof id === "string") : [],
    proposedDate: typeof data.proposedDate === "string" ? data.proposedDate : null,
    proposedTime: typeof data.proposedTime === "string" ? data.proposedTime : null,
    proposedZone: asZone(data.proposedZone),
    updatedAt: iso(data.updatedAt),
    tableLabel: typeof data.tableLabel === "string" && data.tableLabel ? data.tableLabel : null,
    internalNotes: typeof data.internalNotes === "string" ? data.internalNotes : "",
    exceptionReason: typeof data.exception === "object" && data.exception && "reason" in data.exception && typeof data.exception.reason === "string" ? data.exception.reason : null,
    events,
    tracking: await readTrackingState(db, data),
    marketingConsent: data.marketingConsent === true,
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
  tableLabel?: string
  internalNotes?: string
  exceptionConfirmed?: boolean
}

const waiterActions = new Set<StaffAction>(["arrive", "assign", "complete"])

async function transitionReservation(session: StaffSession | null, input: TransitionInput, now = new Date()) {
  assertWritable()
  const actor =
    session?.role === "mesero"
      ? assertStaff(session, ["mesero"])
      : assertStaff(session, ["superadmin", "admin"])
  if (actor.role === "mesero" && (!waiterActions.has(input.action) || input.exceptionConfirmed === true)) {
    throw new ReservationError(403, "forbidden", "Esa acción no está disponible para el mesero.")
  }
  const reason = input.reason?.trim() ?? ""
  if (reason.length > 160) throw new ReservationError(422, "invalid", "El motivo es demasiado largo.")

  const db = getDb()
  const ref = db.collection(collections.reservations).doc(input.id)
  const settingsRef = db.collection(collections.restaurantSettings).doc(settingsDocId)
  const stamp = Timestamp.fromDate(now)

  const notice = await db.runTransaction(async (tx) => {
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
    if (actor.role === "mesero" && input.action === "assign" && status !== "confirmed" && status !== "arrived") {
      throw new ReservationError(403, "forbidden", "Solo puedes asignar mesa a una reserva confirmada o en atención.")
    }

    const keepsStatus = input.action === "note" || input.action === "assign"
    const to = keepsStatus ? status : nextStatus[input.action]
    const patch: ReservationData = {
      status: to,
      updatedAt: stamp,
      revision: input.revision + 1,
      lastModifiedBy: actor.uid,
    }
    const label = (input.tableLabel ?? "").trim().slice(0, 40)

    if (input.action === "note") {
      const notes = (input.internalNotes ?? "").trim()
      if (notes.length > 280) throw new ReservationError(422, "invalid", "La nota es demasiado larga.")
      patch.internalNotes = notes
    }

    if (input.action === "assign") {
      patch.tableLabel = label || null
    }

    if (input.action === "propose" || input.action === "reschedule") {
      const zone = input.proposedZone
      if (!input.proposedDate || !input.proposedTime || !zone) {
        throw new ReservationError(422, "invalid", "Indica la fecha, la hora y la zona propuestas.")
      }
      if (!(input.action === "reschedule" && input.exceptionConfirmed === true)) {
      const errors = validateTime(
        {
          date: input.proposedDate,
          partySize: Number(data.partySize),
          zone,
          preferredTime: input.proposedTime,
          customerName: "ok",
          customerPhone: "",
          customerEmail: "",
          marketingOptIn: false,
          notes: "",
        },
        now,
        { skipPartyLimit: true },
      )
      if (Object.keys(errors).length > 0) {
        throw new ReservationError(422, "invalid", Object.values(errors)[0] ?? "Ese horario no está disponible.")
      }
      }
      patch.proposedDate = input.proposedDate
      patch.proposedTime = input.proposedTime
      patch.proposedZone = zone
      if (reason) patch.rejectionReason = reason
    }

    if (input.action === "confirm" && status === "rejected") patch.rejectionReason = null

    if (input.action === "reject" || input.action === "cancel") {
      patch.rejectionReason = reason || null
      if (input.action === "cancel") patch.cancelledAt = stamp
    }

    const releases = input.action === "cancel" || input.action === "complete"
    const confirms = input.action === "confirm"
    const movesVisit = input.action === "reschedule"
    const oldDate = typeof data.holdDate === "string" ? data.holdDate : ""
    const oldZone = asZone(data.holdZone)
    let targetDate = text(data.date)
    let targetTime = text(data.preferredTime)
    let targetZone = asZone(data.preferredZone)
    if (input.action === "reschedule") {
      targetDate = input.proposedDate ?? ""
      targetTime = input.proposedTime ?? ""
      targetZone = input.proposedZone ?? null
    }
    if (input.action === "confirm" && status === "reschedule_requested" && data.proposedDate && data.proposedTime && asZone(data.proposedZone)) {
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
    const oldSnap = oldRef && (releases || confirms || movesVisit) ? await tx.get(oldRef) : null
    const newSnap = newRef && (!oldRef || newRef.path !== oldRef.path) ? await tx.get(newRef) : oldSnap
    const otherSnap = otherRef ? await tx.get(otherRef) : null
    const daySnap = dayRef ? await tx.get(dayRef) : null
    const trackingId = typeof data.trackingId === "string" ? data.trackingId : ""
    const accessRef = trackingId ? db.collection(collections.reservationAccess).doc(trackingId) : null
    const accessSnap = accessRef && (confirms || movesVisit) ? await tx.get(accessRef) : null
    const assignSnap = input.action === "assign" && oldRef ? await tx.get(oldRef) : null

    if (confirms && (!targetZone || !newRef)) {
      throw new ReservationError(409, "capacity_unconfigured", capacityMessage("unconfigured"))
    }

    if (confirms && targetZone && newRef) {
      const config = readCapacity(settingsSnap?.data(), { allowFixture: Boolean(process.env.FIRESTORE_EMULATOR_HOST) })
      const bookings = { ...bookingsOf(newSnap?.data()) }
      if (oldRef && newRef && oldRef.path === newRef.path) delete bookings[input.id]
      const [hours, minutes] = targetTime.split(":").map(Number)
      const startMin = hours * 60 + minutes
      let plan = planAssignment({
        config,
        bookings,
        zone: targetZone,
        partySize: Number(data.partySize),
        startMin,
      })
      const day = readDayOverride(daySnap?.exists ? daySnap.data() : null, targetDate)
      if (daySnap?.exists && !day) {
        throw new ReservationError(409, "capacity_day", "La excepción de ese día no se pudo leer. La solicitud sigue pendiente.")
      }
      const tablesInZone = config?.tables.filter((table) => table.zone === targetZone) ?? []
      if (!plan.ok && plan.reason === "zone" && config && tablesInZone.length === 0) {
        plan = { ok: true, tableIds: [], endMin: startMin + config.serviceMinutes, slots: 1 }
      }
      const limits = limitsStored(settingsSnap?.data(), day)
      const counted = [
        ...Object.values(bookings),
        ...Object.entries(bookingsOf(otherSnap?.data()))
          .filter(([id]) => id !== input.id)
          .map((entry) => entry[1]),
      ]
      const quota = quotaReason(counted, startMin, limits.daily, limits.slot)
      const problems: string[] = []
      if (!plan.ok) problems.push(plan.reason)
      if (quota) problems.push(quota)
      const labelKey = label.toLocaleLowerCase("es-CL")
      const clashes =
        labelKey.length > 0 &&
        [...Object.entries(bookings), ...Object.entries(bookingsOf(otherSnap?.data()))].some(([id, booking]) => {
          if (id === input.id || !booking.tableLabel) return false
          if (booking.tableLabel.toLocaleLowerCase("es-CL") !== labelKey) return false
          const end = plan.ok ? plan.endMin : startMin + (config?.serviceMinutes ?? 90)
          return booking.startMin < end && startMin < booking.endMin
        })
      if (clashes) problems.push("table")
      if (problems.length > 0 && !(input.exceptionConfirmed === true && reason.length >= 8)) {
        const reasonCode = problems[0] ?? "unconfigured"
        const message =
          reasonCode === "table"
            ? "Esa mesa ya está usada en un horario que se cruza."
            : capacityMessage(reasonCode)
        throw new ReservationError(409, `capacity_${reasonCode}`, message)
      }
      const assignment = plan.ok
        ? { tableIds: plan.tableIds, endMin: plan.endMin, slots: plan.slots ?? Math.max(1, plan.tableIds.length) }
        : { tableIds: [] as string[], endMin: startMin + (config?.serviceMinutes ?? 90), slots: 1 }
      if (problems.length > 0) {
        patch.exception = { by: actor.uid, at: stamp, reason, kinds: problems }
        tx.set(db.collection(collections.auditLogs).doc(), {
          actorUid: actor.uid,
          action: "reservation.exception",
          targetPath: `reservations/${input.id}`,
          summary: `Autorizó una excepción (${problems.join(", ")}): ${reason}`.slice(0, 280),
          at: now.toISOString(),
        })
      }
      const nextBookings = { ...bookingsOf(newSnap?.data()) }
      if (oldRef && newRef && oldRef.path !== newRef.path) {
        releaseHoldBooking(tx, oldRef, oldSnap?.data(), input.id)
      }
      nextBookings[input.id] = {
        tableIds: assignment.tableIds,
        slots: assignment.slots,
        startMin,
        endMin: assignment.endMin,
        zone: targetZone,
        ...(label ? { tableLabel: label } : {}),
      }
      tx.set(newRef, { bookings: nextBookings }, { merge: true })
      patch.assignedTableIds = assignment.tableIds
      patch.tableLabel = label || (typeof data.tableLabel === "string" ? data.tableLabel : null)
      patch.holdDate = targetDate
      patch.holdZone = targetZone
      patch.confirmedBy = actor.uid
      patch.confirmedAt = stamp
      patch.date = targetDate
      patch.preferredTime = targetTime
      patch.preferredZone = targetZone
    }

    if (releases && oldRef) {
      releaseHoldBooking(tx, oldRef, oldSnap?.data(), input.id)
      patch.assignedTableIds = []
      patch.holdDate = null
      patch.holdZone = null
    }

    if (movesVisit && targetZone) {
      if (oldRef) releaseHoldBooking(tx, oldRef, oldSnap?.data(), input.id)
      patch.assignedTableIds = []
      patch.holdDate = null
      patch.holdZone = null
      patch.confirmedBy = null
      patch.confirmedAt = null
      patch.date = targetDate
      patch.preferredTime = targetTime
      patch.preferredZone = targetZone
    }

    if ((confirms || movesVisit) && accessRef && accessSnap?.exists) {
      tx.update(accessRef, { expiresOn: trackingExpiresOn(targetDate) })
    }

    if (input.action === "assign" && actor.role === "mesero") {
      if (!label) throw new ReservationError(422, "invalid", "Elige una mesa.")
      const settingsSnap = await tx.get(settingsRef)
      const tables = readServiceTables(settingsSnap.data())
      if (tables.length === 0) throw new ReservationError(422, "invalid", "Todavía no hay mesas configuradas.")
      const zone = asZone(data.preferredZone)
      const visitDate = text(data.date)
      const holdRef = oldRef ?? (zone ? db.collection(collections.reservationHolds).doc(`${visitDate}_${zone}`) : null)
      const holdSnap = holdRef && oldRef && holdRef.path === oldRef.path ? assignSnap : holdRef ? await tx.get(holdRef) : null
      const bookings = bookingsOf(holdSnap?.data())
      const current = bookings[input.id]
      const startMin = current?.startMin ?? toMinutes(text(data.preferredTime))
      const endMin = current?.endMin ?? startMin + 90
      const partySize = Number(data.partySize) || 0
      const choices = zone
        ? eligibleServiceTables({ tables, zone, partySize, startMin, endMin, bookings, reservationId: input.id })
        : []
      if (!choices.some((table) => table.label.toLocaleLowerCase("es-CL") === label.toLocaleLowerCase("es-CL"))) {
        throw new ReservationError(409, "capacity_table", "Esa mesa no está disponible para esta reserva.")
      }
    }

    if (input.action === "assign" && oldRef && assignSnap) {
      const bookings = { ...bookingsOf(assignSnap.data()) }
      const current = bookings[input.id]
      if (current) {
        const labelKey = label.toLocaleLowerCase("es-CL")
        const clashes =
          labelKey.length > 0 &&
          Object.entries(bookings).some(([id, booking]) => {
            if (id === input.id || !booking.tableLabel) return false
            if (booking.tableLabel.toLocaleLowerCase("es-CL") !== labelKey) return false
            return booking.startMin < current.endMin && current.startMin < booking.endMin
          })
        if (clashes && !(input.exceptionConfirmed === true && reason.length >= 8)) {
          throw new ReservationError(409, "capacity_table", "Esa mesa ya está usada en un horario que se cruza.")
        }
        if (clashes) {
          patch.exception = { by: actor.uid, at: stamp, reason, kinds: ["table"] }
          tx.set(db.collection(collections.auditLogs).doc(), {
            actorUid: actor.uid,
            action: "reservation.exception",
            targetPath: `reservations/${input.id}`,
            summary: `Autorizó una excepción (table): ${reason}`.slice(0, 280),
            at: now.toISOString(),
          })
        }
        const next = { ...current }
        if (label) next.tableLabel = label
        else delete next.tableLabel
        bookings[input.id] = next
        tx.set(oldRef, { bookings }, { merge: true })
      }
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
    return {
      action: input.action,
      id: input.id,
      referenceCode: text(data.referenceCode),
      date: text(patch.date ?? data.date),
      time: text(patch.preferredTime ?? data.preferredTime),
      zone: asZone(patch.preferredZone ?? data.preferredZone) ?? "salon",
      partySize: Number(data.partySize) || 0,
      revision: input.revision + 1,
    }
  })

  await publishReservationNotice(notice).catch(() => undefined)
}

type StaffReservationInput = {
  date: string
  preferredTime: string
  partySize: number
  preferredZone: ReservationZone
  customerName: string
  customerPhone: string
  customerEmail?: string
  notes?: string
  tableLabel?: string
  confirm?: boolean
  exceptionConfirmed?: boolean
  exceptionReason?: string
}

async function createStaffReservation(session: StaffSession | null, input: StaffReservationInput, now = new Date()) {
  assertWritable()
  const actor = assertStaff(session, ["superadmin", "admin"])
  const phone = normalizeChileMobile(input.customerPhone)
  const name = input.customerName.trim()
  if (!phone) throw new ReservationError(422, "invalid", "Ingresa un celular chileno, por ejemplo +56 9 2887 3619.")
  if (name.length < 2 || name.length > 80) throw new ReservationError(422, "invalid", "Escribe el nombre del cliente.")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || isPastDate(input.date, now)) {
    throw new ReservationError(422, "invalid", "Elige una fecha de hoy en adelante.")
  }
  if (!/^\d{2}:\d{2}$/.test(input.preferredTime)) throw new ReservationError(422, "invalid", "Elige una hora.")
  if (!Number.isInteger(input.partySize) || input.partySize < 1 || input.partySize > 40) {
    throw new ReservationError(422, "invalid", "Indica entre 1 y 40 personas.")
  }
  if (input.preferredZone !== "salon" && input.preferredZone !== "terrace") {
    throw new ReservationError(422, "invalid", "Elige salón o terraza.")
  }
  const notes = (input.notes ?? "").trim()
  if (notes.length > 280) throw new ReservationError(422, "invalid", "La nota es demasiado larga.")
  const emailResult = optionalReservationEmail(input.customerEmail ?? "")
  if ("error" in emailResult) throw new ReservationError(422, "invalid", emailResult.error)
  const email = emailResult.email
  const exceptionReason = (input.exceptionReason ?? "").trim()
  if (!input.exceptionConfirmed) {
    const errors = validateTime(
      {
        date: input.date,
        partySize: input.partySize,
        zone: input.preferredZone,
        preferredTime: input.preferredTime,
        customerName: name,
        customerPhone: phone,
        customerEmail: "",
        marketingOptIn: false,
        notes,
      },
      now,
      { skipPartyLimit: true },
    )
    if (Object.keys(errors).length > 0) {
      throw new ReservationError(422, "invalid", Object.values(errors)[0] ?? "Esa reserva no entra en el horario público.")
    }
  } else if (exceptionReason.length < 8) {
    throw new ReservationError(422, "invalid", "Anota por qué esta reserva sale de las reglas.")
  }

  const id = randomUUID()
  const db = getDb()
  const stamp = Timestamp.fromDate(now)
  const taken = new Set<string>()
  let referenceCode: string | null = null
  for (let attempt = 0; attempt < 8 && !referenceCode; attempt += 1) {
    const candidate = claimPublicReference(taken, () => randomInt(0, 10000), 1)
    if (!candidate) break
    const existing = await db.collection(collections.reservations).where("referenceCode", "==", candidate).limit(1).get()
    if (existing.empty) referenceCode = candidate
    else taken.add(candidate)
  }
  if (!referenceCode) throw new ReservationError(503, "reference", "No pudimos asignar una referencia. Inténtalo otra vez.")

  const ref = db.collection(collections.reservations).doc(id)
  await db.runTransaction(async (tx) => {
    tx.set(ref, {
      referenceCode,
      status: "pending",
      date: input.date,
      preferredTime: input.preferredTime,
      partySize: input.partySize,
      preferredZone: input.preferredZone,
      customerName: name,
      customerNameKey: name.toLocaleLowerCase("es-CL"),
      customerPhone: phone,
      ...(email ? { customerEmail: email } : {}),
      notes,
      internalNotes: "",
      tableLabel: null,
      createdAt: stamp,
      updatedAt: stamp,
      revision: 1,
      createdSource: "staff",
      assignedTableIds: [],
      holdDate: null,
      holdZone: null,
      confirmedBy: null,
      lastModifiedBy: actor.uid,
      proposedDate: null,
      proposedTime: null,
      proposedZone: null,
      rejectionReason: null,
      confirmedAt: null,
      cancelledAt: null,
      trackingId: "",
    })
    tx.set(ref.collection("events").doc(), {
      action: "received",
      fromStatus: null,
      toStatus: "pending",
      actorUid: actor.uid,
      at: stamp,
      reason: "Registro del personal",
    })
  })
  await publishReservationNotice({
    action: "received",
    id,
    referenceCode,
    date: input.date,
    time: input.preferredTime,
    zone: input.preferredZone,
    partySize: input.partySize,
    revision: 1,
  }).catch(() => undefined)

  if (input.confirm) {
    try {
      await transitionReservation(
        session,
        {
          id,
          action: "confirm",
          revision: 1,
          reason: exceptionReason,
          exceptionConfirmed: input.exceptionConfirmed === true,
          tableLabel: input.tableLabel,
        },
        now,
      )
    } catch (error) {
      await ref.delete().catch(() => undefined)
      throw error
    }
  } else if (input.tableLabel?.trim()) {
    await transitionReservation(session, { id, action: "assign", revision: 1, tableLabel: input.tableLabel }, now)
  }
  return getReservationForStaff(session, id)
}

export {
  createPublicReservation,
  createStaffReservation,
  getReservationForStaff,
  listReservationHistory,
  listReservationsForStaff,
  rateLimitPerHour,
  reservationSummary,
  transitionReservation,
}
export type { ListQuery, StaffReservationInput, TransitionInput }
