import "server-only"

import { createHash } from "node:crypto"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

import type { StaffSession } from "@/lib/auth/roles"
import { collections } from "@/lib/firebase/model"
import { santiagoParts, todayIsoInSantiago } from "@/lib/reservations/schedule"
import type { ReservationZone } from "@/lib/reservations/types"
import { assertStaff } from "@/server/auth/authorization"
import { getDb } from "@/server/firebase/firestore"

const reminderMinutes = 30
const attentionAfterMs = 20 * 60 * 1000

type NoticeType = "created" | "upcoming" | "attention" | "rescheduled" | "cancelled" | "changed" | "confirmed"

type StaffNotice = {
  id: string
  type: NoticeType
  reservationId: string
  referenceCode: string
  title: string
  body: string
  at: string
  unread: boolean
}

type NoticeInput = {
  type: NoticeType
  reservationId: string
  referenceCode: string
  title: string
  body: string
  key: string
  at?: Date
}

function noticeId(type: string, reservationId: string, key: string) {
  return createHash("sha256").update(`${type}|${reservationId}|${key}`).digest("hex").slice(0, 32)
}

function zoneLabel(zone: ReservationZone) {
  return zone === "terrace" ? "Terraza" : "Salón"
}

async function putNotice(input: NoticeInput) {
  const db = getDb()
  const id = noticeId(input.type, input.reservationId, input.key)
  const ref = db.collection(collections.staffNotifications).doc(id)
  try {
    await ref.create({
      type: input.type,
      reservationId: input.reservationId,
      referenceCode: input.referenceCode,
      title: input.title,
      body: input.body,
      at: Timestamp.fromDate(input.at ?? new Date()),
      readBy: [],
    })
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : ""
    if (code !== "6" && code !== "already-exists" && !code.includes("ALREADY_EXISTS")) throw error
  }
}

async function publishReservationNotice(input: {
  action: string
  id: string
  referenceCode: string
  date: string
  time: string
  zone: ReservationZone
  partySize: number
  revision: number
}) {
  const visit = `${input.time} · ${input.partySize} personas · ${zoneLabel(input.zone)}`
  const base = {
    reservationId: input.id,
    referenceCode: input.referenceCode,
    body: visit,
    key: String(input.revision),
  }
  if (input.action === "received") {
    await putNotice({ ...base, type: "created", title: "Nueva reserva", key: "new" })
    return
  }
  if (input.action === "confirm") {
    await putNotice({ ...base, type: "confirmed", title: "Reserva confirmada" })
    return
  }
  if (input.action === "reschedule") {
    await putNotice({ ...base, type: "rescheduled", title: "Reserva reagendada", body: `${input.referenceCode} · ${visit}` })
    return
  }
  if (input.action === "cancel") {
    await putNotice({ ...base, type: "cancelled", title: "Cancelación", body: `${input.referenceCode} · ${visit}` })
    return
  }
  if (input.action === "reject" || input.action === "propose" || input.action === "assign") {
    const title = input.action === "reject" ? "Solicitud rechazada" : input.action === "propose" ? "Cambio propuesto" : "Mesa actualizada"
    await putNotice({ ...base, type: "changed", title, body: `${input.referenceCode} · ${visit}` })
  }
}

async function sweepNotices(now = new Date()) {
  const db = getDb()
  const today = todayIsoInSantiago(now)
  const nowMin = santiagoParts(now).minutes
  const day = await db.collection(collections.reservations).where("date", "==", today).limit(40).get()
  for (const doc of day.docs) {
    const data = doc.data()
    if (data.status !== "confirmed" || typeof data.preferredTime !== "string") continue
    const [hour, minute] = data.preferredTime.split(":").map(Number)
    const start = hour * 60 + minute
    const until = start - nowMin
    if (until < 0 || until > reminderMinutes) continue
    await putNotice({
      type: "upcoming",
      reservationId: doc.id,
      referenceCode: typeof data.referenceCode === "string" ? data.referenceCode : "",
      title: "Reserva próxima",
      body: `La reserva ${typeof data.referenceCode === "string" ? data.referenceCode : ""} comienza en ${until} minutos.`,
      key: `${today}|${data.preferredTime}`,
      at: now,
    })
  }

  const pending = await db.collection(collections.reservations).where("status", "==", "pending").limit(20).get()
  for (const doc of pending.docs) {
    const data = doc.data()
    const created = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null
    if (!created || now.getTime() - created.getTime() < attentionAfterMs) continue
    const zone = data.preferredZone === "terrace" ? "Terraza" : "Salón"
    await putNotice({
      type: "attention",
      reservationId: doc.id,
      referenceCode: typeof data.referenceCode === "string" ? data.referenceCode : "",
      title: "Sigue pendiente",
      body: `${typeof data.preferredTime === "string" ? data.preferredTime : ""} · ${Number(data.partySize) || 0} personas · ${zone}`,
      key: "pending",
      at: created,
    })
  }
}

async function listStaffNotices(session: StaffSession | null, now = new Date()): Promise<StaffNotice[]> {
  assertStaff(session, ["superadmin", "admin"])
  await sweepNotices(now).catch(() => undefined)
  const snap = await getDb().collection(collections.staffNotifications).orderBy("at", "desc").limit(30).get()
  return snap.docs.map((doc) => {
    const data = doc.data()
    const at = data.at instanceof Timestamp ? data.at.toDate().toISOString() : ""
    const readBy = Array.isArray(data.readBy) ? data.readBy.filter((item) => typeof item === "string") : []
    return {
      id: doc.id,
      type: data.type,
      reservationId: typeof data.reservationId === "string" ? data.reservationId : "",
      referenceCode: typeof data.referenceCode === "string" ? data.referenceCode : "",
      title: typeof data.title === "string" ? data.title : "Aviso",
      body: typeof data.body === "string" ? data.body : "",
      at,
      unread: session ? !readBy.includes(session.uid) : true,
    }
  })
}

async function markStaffNoticesRead(session: StaffSession | null, ids: string[]) {
  const actor = assertStaff(session, ["superadmin", "admin"])
  const unique = [...new Set(ids)].filter((id) => /^[a-f0-9]{32}$/.test(id)).slice(0, 20)
  const db = getDb()
  await Promise.all(
    unique.map((id) =>
      db
        .collection(collections.staffNotifications)
        .doc(id)
        .update({ readBy: FieldValue.arrayUnion(actor.uid) })
        .catch(() => undefined),
    ),
  )
}

export { listStaffNotices, markStaffNoticesRead, publishReservationNotice, sweepNotices }
export type { StaffNotice }
