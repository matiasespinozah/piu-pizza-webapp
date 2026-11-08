import "server-only"

import { z } from "zod"

import type { StaffSession } from "@/lib/auth/roles"
import { collections, settingsDocId } from "@/lib/firebase/model"
import { firebaseDataAccessEnabled } from "@/lib/firebase/access"
import { emptyDay, readDayOverride, type DayOverride } from "@/lib/reservations/day-policy"
import {
  criticalFingerprint,
  defaultOperationRules,
  operationsDocument,
  readinessIssues,
  readOperationRules,
  type OperationRules,
} from "@/lib/reservations/operations"
import { clockFromWeek } from "@/lib/reservations/schedule"
import { assertStaff } from "@/server/auth/authorization"
import { assertFirebaseDataEnabled } from "@/server/firebase/guard"
import { getDb } from "@/server/firebase/firestore"

const floorRoles = ["superadmin", "admin"] as const
const isoDate = /^\d{4}-\d{2}-\d{2}$/

class FloorError extends Error {
  readonly status: number
  readonly issues: string[]

  constructor(status: number, message: string, issues: string[] = []) {
    super(message)
    this.name = "FloorError"
    this.status = status
    this.issues = issues
  }
}

const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/

const sectorInput = z
  .object({
    total: z.number().int().min(0).max(40),
    web: z.number().int().min(0).max(40),
  })
  .strict()

const dayServiceInput = z
  .object({
    open: z.boolean(),
    opensAt: z.string().regex(hhmm),
    closesAt: z.string().regex(hhmm),
  })
  .strict()

const rulesInput = z
  .object({
    serviceMinutes: z.number().int().min(30).max(300),
    receptionPaused: z.boolean(),
    fullNotice: z.string().trim().min(8).max(400),
    sectors: z.object({ salon: sectorInput, terrace: sectorInput }).strict(),
    week: z
      .object({
        mon: dayServiceInput,
        tue: dayServiceInput,
        wed: dayServiceInput,
        thu: dayServiceInput,
        fri: dayServiceInput,
        sat: dayServiceInput,
        sun: dayServiceInput,
      })
      .strict(),
  })
  .strict()

const dayCapInput = z
  .object({
    mode: z.enum(["inherit", "none", "capped"]),
    max: z.number().int().nullable(),
  })
  .strict()

const dayInput = z
  .object({
    date: z.string().regex(isoDate),
    closed: z.boolean(),
    full: z.boolean(),
    hours: z.object({ opensAt: z.string(), closesAt: z.string() }).strict().nullable(),
    lastSeatingTime: z.string().nullable(),
    daily: dayCapInput,
    slot: dayCapInput,
    notice: z.string().trim().max(400).nullable(),
  })
  .strict()

async function getOperationRules(): Promise<OperationRules> {
  if (!firebaseDataAccessEnabled()) return defaultOperationRules()
  const snap = await getDb().collection(collections.restaurantSettings).doc(settingsDocId).get()
  return readOperationRules(snap.data()) ?? defaultOperationRules()
}

async function getDayOverride(date: string): Promise<DayOverride> {
  if (!firebaseDataAccessEnabled() || !isoDate.test(date)) return emptyDay(date || "1970-01-01")
  const snap = await getDb().collection(collections.reservationDays).doc(date).get()
  if (!snap.exists) return emptyDay(date)
  return readDayOverride(snap.data(), date) ?? { ...emptyDay(date), closed: true }
}

async function readFloor(session: StaffSession | null, date: string) {
  assertStaff(session, floorRoles)
  if (!firebaseDataAccessEnabled()) return null
  if (!isoDate.test(date)) throw new FloorError(400, "Esa fecha no es válida.")
  const db = getDb()
  const [rules, salon, terrace, pending, day] = await Promise.all([
    getOperationRules(),
    db.collection(collections.reservationHolds).doc(`${date}_salon`).get(),
    db.collection(collections.reservationHolds).doc(`${date}_terrace`).get(),
    db.collection(collections.reservations).where("date", "==", date).limit(50).get(),
    getDayOverride(date),
  ])
  const bookings = [...bookingsOf(salon.data() as Record<string, unknown> | undefined), ...bookingsOf(terrace.data() as Record<string, unknown> | undefined)]
  const pendingCount = pending.docs.filter((item) => item.get("status") === "pending").length
  const confirmedCount = pending.docs.filter((item) => item.get("status") === "confirmed").length
  return { rules, bookings, pendingCount, confirmedCount, pendingTruncated: pending.size === 50, day }
}

async function saveFloor(session: StaffSession | null, input: unknown) {
  const actor = assertStaff(session, floorRoles)
  assertFirebaseDataEnabled()
  const parsed = rulesInput.safeParse(input)
  if (!parsed.success) throw new FloorError(400, "Revisa las mesas y los horarios. Hay un dato vacío o fuera de rango.")
  for (const day of Object.values(parsed.data.week)) {
    if (day.opensAt >= day.closesAt) throw new FloorError(400, "La apertura tiene que ser anterior al cierre.")
  }
  for (const [zone, label] of [
    ["salon", "el salón"],
    ["terrace", "la terraza"],
  ] as const) {
    const side = parsed.data.sectors[zone]
    if (side.web > side.total) throw new FloorError(400, `En ${label} hay más mesas para la web que mesas en total.`)
  }
  const db = getDb()
  const ref = db.collection(collections.restaurantSettings).doc(settingsDocId)
  const current = await ref.get()
  if (current.exists && !readOperationRules(current.data())) {
    throw new FloorError(409, "La configuración guardada no se pudo leer. No se sobrescribió.")
  }
  const stored = readOperationRules(current.data()) ?? defaultOperationRules()
  const rules: OperationRules = {
    ...stored,
    serviceMinutes: parsed.data.serviceMinutes,
    receptionPaused: parsed.data.receptionPaused,
    sectors: parsed.data.sectors,
    week: parsed.data.week,
    clock: clockFromWeek(parsed.data.week, stored.clock),
    notices: { ...stored.notices, full: { enabled: true, text: parsed.data.fullNotice } },
    tables: stored.tables,
  }
  rules.validatedFingerprint = stored.validatedFingerprint
  rules.productionReady = stored.validatedFingerprint === criticalFingerprint(rules)
  rules.updatedBy = actor.displayName || actor.email || "Personal"
  rules.updatedAt = new Date().toISOString()
  const document = operationsDocument(rules)
  const batch = db.batch()
  batch.set(ref, document)
  batch.set(
    db.collection(collections.auditLogs).doc(),
    auditEntry(actor, "operations.save", settingsPath(), "Guardó cupos, horario o duración. Las reservas ya confirmadas no se cancelan."),
  )
  await batch.commit()
  return rules
}

async function enableFloor(session: StaffSession | null) {
  const actor = assertStaff(session, ["superadmin"])
  assertFirebaseDataEnabled()
  const db = getDb()
  const ref = db.collection(collections.restaurantSettings).doc(settingsDocId)
  const current = await ref.get()
  const rules = readOperationRules(current.data()) ?? defaultOperationRules()
  const issues = readinessIssues(rules)
  if (issues.length > 0) throw new FloorError(422, "Falta información para habilitar la configuración.", issues)
  rules.validatedFingerprint = criticalFingerprint(rules)
  rules.productionReady = true
  rules.updatedBy = actor.displayName || actor.email || "Personal"
  rules.updatedAt = new Date().toISOString()
  const document = operationsDocument(rules)
  if (!document.productionReady) throw new FloorError(422, "La configuración no quedó validada.")
  const batch = db.batch()
  batch.set(ref, document)
  batch.set(
    db.collection(collections.auditLogs).doc(),
    auditEntry(actor, "operations.enable", settingsPath(), "Habilitó la configuración para confirmar. La recepción pública no se encendió."),
  )
  await batch.commit()
  return rules
}

async function saveDay(session: StaffSession | null, input: unknown) {
  const actor = assertStaff(session, floorRoles)
  assertFirebaseDataEnabled()
  const parsed = dayInput.safeParse(input)
  if (!parsed.success) throw new FloorError(400, "Revisa el día. Hay un dato vacío o fuera de rango.")
  if (parsed.data.closed && parsed.data.full) {
    throw new FloorError(400, "Un día se cierra o se marca completo, no las dos cosas.")
  }
  const day = readDayOverride(
    {
      ...parsed.data,
      notice: parsed.data.notice,
      updatedBy: actor.displayName || actor.email || "Personal",
      updatedAt: new Date().toISOString(),
    },
    parsed.data.date,
  )
  if (!day) throw new FloorError(400, "Revisa el día. Hay un dato vacío o fuera de rango.")
  const db = getDb()
  const ref = db.collection(collections.reservationDays).doc(day.date)
  const batch = db.batch()
  if (!day.closed && !day.full && !day.hours && !day.notice && day.daily.mode === "inherit" && day.slot.mode === "inherit") {
    batch.delete(ref)
  } else {
    batch.set(ref, day)
  }
  batch.set(
    db.collection(collections.auditLogs).doc(),
    auditEntry(actor, "operations.day", `${collections.reservationDays}/${day.date}`, `Actualizó la disponibilidad del ${day.date}. No canceló reservas.`),
  )
  await batch.commit()
  return day
}

function settingsPath() {
  return `${collections.restaurantSettings}/${settingsDocId}`
}

function auditEntry(actor: StaffSession, action: string, targetPath: string, summary: string) {
  return {
    actorUid: actor.uid,
    action,
    targetPath,
    summary: summary.slice(0, 280),
    at: new Date().toISOString(),
  }
}

function bookingsOf(data: Record<string, unknown> | undefined) {
  const raw = data?.bookings
  if (!raw || typeof raw !== "object") return []
  return Object.entries(raw as Record<string, { tableIds?: string[]; startMin?: number; endMin?: number; zone?: string }>).flatMap(
    ([id, booking]) => {
      if (!booking || !Array.isArray(booking.tableIds) || typeof booking.startMin !== "number" || typeof booking.endMin !== "number") {
        return []
      }
      return [{ id, tableIds: booking.tableIds, startMin: booking.startMin, endMin: booking.endMin, zone: booking.zone ?? "" }]
    },
  )
}

export { FloorError, enableFloor, getDayOverride, getOperationRules, readFloor, saveDay, saveFloor }
