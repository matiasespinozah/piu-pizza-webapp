import { previousIso } from "@/lib/reservations/schedule"

const staffViews = ["today", "future", "past", "pending", "attention", "upcoming"] as const

type StaffView = (typeof staffViews)[number]

type ScheduleDirection = "asc" | "desc"

type ScheduleRow = {
  id: string
  date: string
  preferredTime: string
}

type PastWindow = {
  month: string
  label: string
  from: string
  to: string
  empty: boolean
  previousMonth: string
  nextMonth: string | null
}

function staffView(value: string | undefined): StaffView {
  return staffViews.includes(value as StaffView) ? (value as StaffView) : "today"
}

function monthKey(isoDate: string) {
  return isoDate.slice(0, 7)
}

function shiftMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split("-").map(Number)
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}

function lastIsoOfMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number)
  return new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10)
}

function clampMonth(value: string | undefined, today: string) {
  const current = monthKey(today)
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value) || value > current) return current
  return value
}

function monthLabel(month: string) {
  const formatted = new Intl.DateTimeFormat("es-CL", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(`${month}-15T12:00:00Z`))
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

/** Mes ya cerrado, o el mes actual hasta ayer. Un mes futuro vuelve al mes de hoy. */
function pastWindow(value: string | undefined, today: string): PastWindow {
  const month = clampMonth(value, today)
  const current = monthKey(today)
  const from = `${month}-01`
  const to = month === current ? previousIso(today) : lastIsoOfMonth(month)
  return {
    month,
    label: monthLabel(month),
    from,
    to,
    empty: from > to,
    previousMonth: shiftMonth(month, -1),
    nextMonth: month < current ? shiftMonth(month, 1) : null,
  }
}

function compareSchedule(left: ScheduleRow, right: ScheduleRow, direction: ScheduleDirection) {
  const sign = direction === "asc" ? 1 : -1
  if (left.date !== right.date) return left.date < right.date ? -sign : sign
  if (left.preferredTime !== right.preferredTime) return left.preferredTime < right.preferredTime ? -sign : sign
  if (left.id !== right.id) return left.id < right.id ? -sign : sign
  return 0
}

function pageSchedule<T extends ScheduleRow>(rows: readonly T[], direction: ScheduleDirection, cursor: string | undefined, size: number) {
  const sorted = rows.toSorted((left, right) => compareSchedule(left, right, direction))
  const found = cursor ? sorted.findIndex((row) => row.id === cursor) : -1
  const start = found >= 0 ? found + 1 : 0
  const items = sorted.slice(start, start + size)
  const nextCursor = sorted.length > start + size ? (items.at(-1)?.id ?? null) : null
  return { items, nextCursor }
}

export { compareSchedule, pageSchedule, pastWindow, staffView }
export type { PastWindow, ScheduleDirection, ScheduleRow, StaffView }
