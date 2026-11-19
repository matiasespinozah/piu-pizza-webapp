import "server-only"

import { FieldPath } from "firebase-admin/firestore"

import type { StaffSession } from "@/lib/auth/roles"
import { firebaseDataAccessEnabled } from "@/lib/firebase/access"
import { collections, settingsDocId } from "@/lib/firebase/model"
import { ReservationError } from "@/lib/reservations/errors"
import { todayIsoInSantiago, toMinutes } from "@/lib/reservations/schedule"
import { eligibleServiceTables, readServiceTables, type ServiceTableChoice } from "@/lib/reservations/service-tables"
import type { ServiceBoard, ServiceReservation } from "@/lib/reservations/service-view"
import type { ReservationStatus, ReservationZone } from "@/lib/reservations/types"
import { assertStaff } from "@/server/auth/authorization"
import { getDb } from "@/server/firebase/firestore"

const serviceLimit = 80
const serviceStatuses = new Set<ReservationStatus>(["confirmed", "arrived", "completed"])

function text(value: unknown) {
  return typeof value === "string" ? value : ""
}

function asZone(value: unknown): ReservationZone | null {
  return value === "salon" || value === "terrace" ? value : null
}

function serviceCard(id: string, data: Record<string, unknown>): ServiceReservation | null {
  const status = data.status
  const zone = asZone(data.preferredZone)
  if ((status !== "confirmed" && status !== "arrived" && status !== "completed") || !zone || typeof data.revision !== "number") {
    return null
  }
  if (!serviceStatuses.has(status)) return null
  return {
    id,
    referenceCode: text(data.referenceCode),
    status,
    date: text(data.date),
    preferredTime: text(data.preferredTime),
    partySize: Number(data.partySize) || 0,
    preferredZone: zone,
    customerName: text(data.customerName),
    notes: text(data.notes),
    tableLabel: typeof data.tableLabel === "string" && data.tableLabel ? data.tableLabel : null,
    internalNotes: text(data.internalNotes),
    revision: data.revision,
  }
}

function emptyBoard(today: string, ready: boolean, indexError = false): ServiceBoard {
  return { ready, indexError, today, arriving: [], serving: [], finished: [] }
}

async function listServiceBoard(session: StaffSession | null, now = new Date()): Promise<ServiceBoard> {
  assertStaff(session, ["mesero"])
  const today = todayIsoInSantiago(now)
  if (!firebaseDataAccessEnabled()) return emptyBoard(today, false)
  try {
    const snap = await getDb()
      .collection(collections.reservations)
      .where("date", "==", today)
      .orderBy("preferredTime", "asc")
      .orderBy(FieldPath.documentId(), "asc")
      .limit(serviceLimit)
      .get()
    const items = snap.docs.map((item) => serviceCard(item.id, item.data())).filter((item): item is ServiceReservation => item != null)
    return {
      ready: true,
      indexError: false,
      today,
      arriving: items.filter((item) => item.status === "confirmed"),
      serving: items.filter((item) => item.status === "arrived"),
      finished: items.filter((item) => item.status === "completed"),
    }
  } catch {
    return emptyBoard(today, true, true)
  }
}

async function tablesForService(session: StaffSession | null, id: string): Promise<{ configured: boolean; tables: ServiceTableChoice[] }> {
  assertStaff(session, ["mesero"])
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ReservationError(404, "missing", "No encontramos esa reserva.")
  if (!firebaseDataAccessEnabled()) throw new ReservationError(503, "disabled", "Las reservas en línea no están disponibles.")
  const db = getDb()
  const snap = await db.collection(collections.reservations).doc(id).get()
  const card = snap.exists ? serviceCard(snap.id, snap.data() ?? {}) : null
  if (!card || (card.status !== "confirmed" && card.status !== "arrived")) {
    throw new ReservationError(404, "missing", "No encontramos esa reserva.")
  }
  const settings = await db.collection(collections.restaurantSettings).doc(settingsDocId).get()
  const tables = readServiceTables(settings.data())
  if (tables.length === 0) return { configured: false, tables: [] }
  const hold = await db.collection(collections.reservationHolds).doc(`${card.date}_${card.preferredZone}`).get()
  const raw = hold.data()?.bookings
  const bookings = raw && typeof raw === "object" ? (raw as Record<string, { tableIds?: string[]; tableLabel?: string; startMin: number; endMin: number }>) : {}
  const current = bookings[id]
  const startMin = current?.startMin ?? toMinutes(card.preferredTime)
  const endMin = current?.endMin ?? startMin + 90
  return {
    configured: true,
    tables: eligibleServiceTables({
      tables,
      zone: card.preferredZone,
      partySize: card.partySize,
      startMin,
      endMin,
      bookings,
      reservationId: id,
    }),
  }
}

export { listServiceBoard, tablesForService }
