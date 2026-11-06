import { reservationConfig } from "@/lib/reservations/configuration"

type OpeningWindow = {
  opensAt: string
  closesAt: string
}

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const

type Weekday = (typeof WEEKDAYS)[number]

function santiagoParts(instant: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: reservationConfig.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(instant)

  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ""

  return {
    iso: `${value("year")}-${value("month")}-${value("day")}`,
    minutes: Number(value("hour")) * 60 + Number(value("minute")),
    weekday: value("weekday"),
  }
}

/** Fecha civil de hoy en Chile, independiente de la zona del servidor. */
function todayIsoInSantiago(now = new Date()) {
  return santiagoParts(now).iso
}

function instantForCivilDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number)
  // 16:00 UTC cae de mañana o de tarde en Chile, siempre en el mismo día civil.
  return new Date(Date.UTC(year, month - 1, day, 16, 0, 0))
}

function weekdayOf(isoDate: string): Weekday {
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: reservationConfig.timeZone,
    weekday: "short",
  }).format(instantForCivilDate(isoDate))
  const index = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(label)
  return WEEKDAYS[index] ?? "sun"
}

function isClosedDay(isoDate: string) {
  return weekdayOf(isoDate) === "sun"
}

function isPastDate(isoDate: string, now = new Date()) {
  return isoDate < todayIsoInSantiago(now)
}

/**
 * Horario de atención. El último ingreso reservable todavía no está definido:
 * los chips llegan hasta el último intervalo anterior al cierre.
 */
function openingWindow(isoDate: string): OpeningWindow | null {
  const day = weekdayOf(isoDate)
  if (day === "sun") return null
  if (day === "fri" || day === "sat") return { opensAt: "13:00", closesAt: "23:00" }
  return { opensAt: "17:00", closesAt: "22:00" }
}

function toMinutes(hhmm: string) {
  const [hours, minutes] = hhmm.split(":").map(Number)
  return hours * 60 + minutes
}

function fromMinutes(total: number) {
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

/** Horarios de preferencia dentro del horario de atención. No son cupos. */
function preferenceSlots(isoDate: string, now = new Date()) {
  const window = openingWindow(isoDate)
  if (!window || isPastDate(isoDate, now)) return []

  const start = toMinutes(window.opensAt)
  const end = toMinutes(window.closesAt)
  const slots: string[] = []
  for (let minute = start; minute < end; minute += reservationConfig.slotMinutes) {
    slots.push(fromMinutes(minute))
  }

  if (isoDate !== todayIsoInSantiago(now)) return slots
  const current = santiagoParts(now).minutes
  return slots.filter((slot) => toMinutes(slot) > current)
}

function formatVisitDate(isoDate: string) {
  const formatted = new Intl.DateTimeFormat("es-CL", {
    timeZone: reservationConfig.timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(instantForCivilDate(isoDate))
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

export {
  formatVisitDate,
  isClosedDay,
  isPastDate,
  openingWindow,
  preferenceSlots,
  todayIsoInSantiago,
  weekdayOf,
}
export type { OpeningWindow, Weekday }
