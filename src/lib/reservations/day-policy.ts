import type { OperationRules, PublicNotice, ReservationCap } from "@/lib/reservations/operations"
import { defaultNotices, defaultOperationRules, rawLimits, readOperationRules, receptionPausedOf } from "@/lib/reservations/operations"
import { openingWindow, type OpeningWindow, type ReservationClock } from "@/lib/reservations/schedule"
import type { HoldBooking } from "@/lib/reservations/capacity"

type DayCap = {
  mode: "inherit" | "none" | "capped"
  max: number | null
}

type DayOverride = {
  date: string
  closed: boolean
  full: boolean
  hours: OpeningWindow | null
  lastSeatingTime: string | null
  daily: DayCap
  slot: DayCap
  notice: string | null
  updatedBy: string | null
  updatedAt: string | null
}

type Admission =
  | { ok: true }
  | { ok: false; code: "paused" | "closed" | "full" | "venue"; message: string }

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function emptyDay(date: string): DayOverride {
  return {
    date,
    closed: false,
    full: false,
    hours: null,
    lastSeatingTime: null,
    daily: { mode: "inherit", max: null },
    slot: { mode: "inherit", max: null },
    notice: null,
    updatedBy: null,
    updatedAt: null,
  }
}

function readDayCap(value: unknown, ceiling: number): DayCap | null {
  if (value === undefined || value === null) return { mode: "inherit", max: null }
  if (!value || typeof value !== "object") return null
  const cap = value as Record<string, unknown>
  if (cap.mode === "inherit" || cap.mode === "none") return { mode: cap.mode, max: null }
  if (cap.mode !== "capped") return null
  if (typeof cap.max !== "number" || !Number.isInteger(cap.max) || cap.max < 1 || cap.max > ceiling) return null
  return { mode: "capped", max: cap.max }
}

function readDayOverride(value: unknown, date: string): DayOverride | null {
  if (value === undefined || value === null) return emptyDay(date)
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  if (typeof record.closed !== "boolean" || typeof record.full !== "boolean") return null
  let hours: OpeningWindow | null = null
  if (record.hours !== null && record.hours !== undefined) {
    if (!record.hours || typeof record.hours !== "object") return null
    const window = record.hours as Record<string, unknown>
    if (typeof window.opensAt !== "string" || typeof window.closesAt !== "string") return null
    if (!HHMM.test(window.opensAt) || !HHMM.test(window.closesAt) || window.opensAt >= window.closesAt) return null
    hours = { opensAt: window.opensAt, closesAt: window.closesAt }
  }
  const last = record.lastSeatingTime
  if (last !== null && last !== undefined && (typeof last !== "string" || !HHMM.test(last))) return null
  const daily = readDayCap(record.daily, 400)
  const slot = readDayCap(record.slot, 80)
  if (!daily || !slot) return null
  const notice = record.notice
  if (notice !== null && notice !== undefined && (typeof notice !== "string" || notice.trim().length > 400)) return null
  if (!ISO_DATE.test(date)) return null
  return {
    date,
    closed: record.closed,
    full: record.full,
    hours,
    lastSeatingTime: typeof last === "string" ? last : null,
    daily,
    slot,
    notice: typeof notice === "string" && notice.trim() ? notice.trim() : null,
    updatedBy: typeof record.updatedBy === "string" ? record.updatedBy.slice(0, 80) : null,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : null,
  }
}

function noticeText(notice: PublicNotice, fallback: string) {
  return notice.enabled && notice.text.trim() ? notice.text.trim() : fallback
}

function admitRequest(rules: Pick<OperationRules, "clock" | "receptionPaused" | "notices">, day: DayOverride | null, isoDate: string): Admission {
  const notices = rules.notices ?? defaultNotices()
  if (rules.receptionPaused) {
    return { ok: false, code: "paused", message: noticeText(notices.paused, "Por ahora no estamos tomando reservas en línea.") }
  }
  if (day?.closed) {
    return {
      ok: false,
      code: "closed",
      message: day.notice ?? noticeText(notices.closedDay, "Ese día no estamos recibiendo reservas en línea."),
    }
  }
  const window = openingWindow(isoDate, rules.clock, day)
  if (!window) {
    return { ok: false, code: "venue", message: noticeText(notices.venueClosed, "Ese día el local está cerrado.") }
  }
  if (day?.full) {
    return {
      ok: false,
      code: "full",
      message: day.notice ?? noticeText(notices.full, "Las reservas de ese día están completas. Seguimos recibiendo clientes por orden de llegada."),
    }
  }
  return { ok: true }
}

function resolveCap(day: DayCap | undefined, global: ReservationCap): number | null {
  if (day?.mode === "none") return null
  if (day?.mode === "capped") return day.max
  if (global.mode === "capped") return global.max
  return null
}

function limitsFor(rules: Pick<OperationRules, "dailyLimit" | "slotLimit">, day: DayOverride | null) {
  return {
    daily: resolveCap(day?.daily, rules.dailyLimit),
    slot: resolveCap(day?.slot, rules.slotLimit),
  }
}

/** Cuenta reservas ya confirmadas. El tope diario no es la cantidad de personas sentadas a la vez. */
function quotaReason(bookings: HoldBooking[], startMin: number, dailyMax: number | null, slotMax: number | null) {
  if (dailyMax !== null && bookings.length >= dailyMax) return "daily" as const
  if (slotMax !== null && bookings.filter((booking) => booking.startMin === startMin).length >= slotMax) return "slot" as const
  return null
}

function admitStored(settings: unknown, dayData: unknown, isoDate: string): Admission {
  const parsed = readOperationRules(settings)
  const rules = parsed ?? defaultOperationRules()
  const day = dayData == null ? emptyDay(isoDate) : readDayOverride(dayData, isoDate)
  if (!day) {
    return { ok: false, code: "closed", message: "Ese día no está disponible para reservas." }
  }
  return admitRequest({ ...rules, receptionPaused: rules.receptionPaused || receptionPausedOf(settings) }, day, isoDate)
}

function limitsStored(settings: unknown, day: DayOverride | null) {
  const parsed = readOperationRules(settings)
  return limitsFor(parsed ?? rawLimits(settings), day)
}

function visitException(day: DayOverride | null) {
  if (!day) return null
  return { closed: day.closed, hours: day.hours, lastSeatingTime: day.lastSeatingTime }
}

function publicClock(clock: ReservationClock, day: DayOverride | null): ReservationClock {
  if (!day?.hours) return clock
  return { ...clock, weekday: day.hours, weekend: day.hours, lastSeatingTime: day.lastSeatingTime }
}

export { admitRequest, admitStored, emptyDay, limitsFor, limitsStored, quotaReason, readDayOverride, visitException, publicClock }
export type { Admission, DayOverride }
