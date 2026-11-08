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

type ReservationClock = {
  weekday: OpeningWindow
  weekend: OpeningWindow
  /** Última hora de llegada. Null: todavía no está definida. */
  lastSeatingTime: string | null
}

/** Excepción de un día. `hours` en null usa el horario semanal. */
type VisitHours = {
  closed: boolean
  hours: OpeningWindow | null
  lastSeatingTime: string | null
}

/** Horario que el restaurante ya confirmó. La última llegada sigue sin definirse. */
const confirmedClock: ReservationClock = {
  weekday: { opensAt: "17:00", closesAt: "22:00" },
  weekend: { opensAt: "13:00", closesAt: "23:00" },
  lastSeatingTime: null,
}

/**
 * Horario de atención. Sin última llegada, los horarios llegan hasta el intervalo anterior al cierre.
 */
function openingWindow(isoDate: string, clock: ReservationClock = confirmedClock, visit?: VisitHours | null): OpeningWindow | null {
  if (visit?.closed) return null
  if (visit?.hours) return visit.hours
  const day = weekdayOf(isoDate)
  if (day === "sun") return null
  if (day === "fri" || day === "sat") return clock.weekend
  return clock.weekday
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
function preferenceSlots(isoDate: string, now = new Date(), clock: ReservationClock = confirmedClock, visit?: VisitHours | null) {
  const window = openingWindow(isoDate, clock, visit)
  if (!window || isPastDate(isoDate, now)) return []

  const start = toMinutes(window.opensAt)
  const end = toMinutes(window.closesAt)
  const lastSource = visit?.hours ? visit.lastSeatingTime : clock.lastSeatingTime
  const lastArrival = lastSource ? toMinutes(lastSource) : null
  const slots: string[] = []
  for (let minute = start; minute < end; minute += reservationConfig.slotMinutes) {
    if (lastArrival !== null && minute > lastArrival) break
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

/** Instante civil de Chile. Sirve para medir la anticipación sin fijar un desfase horario. */
function instantInSantiago(isoDate: string, hhmm: string) {
  const [year, month, day] = isoDate.split("-").map(Number)
  const [hour, minute] = hhmm.split(":").map(Number)
  let utc = Date.UTC(year, month - 1, day, hour + 4, minute)
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = santiagoParts(new Date(utc))
    const [gotYear, gotMonth, gotDay] = parts.iso.split("-").map(Number)
    const got = Date.UTC(gotYear, gotMonth - 1, gotDay, Math.floor(parts.minutes / 60), parts.minutes % 60)
    const desired = Date.UTC(year, month - 1, day, hour, minute)
    if (got === desired) return new Date(utc)
    utc += desired - got
  }
  return new Date(utc)
}

function previousIso(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

export {
  confirmedClock,
  formatVisitDate,
  instantInSantiago,
  isClosedDay,
  isPastDate,
  openingWindow,
  preferenceSlots,
  previousIso,
  santiagoParts,
  todayIsoInSantiago,
  toMinutes,
  weekdayOf,
}
export type { OpeningWindow, ReservationClock, VisitHours, Weekday }
