import { occupiedSlots, type HoldBooking } from "@/lib/reservations/capacity"
import { reservationConfig } from "@/lib/reservations/configuration"
import { confirmedClock, openingWindow, toMinutes, type VisitHours, type WeekSchedule } from "@/lib/reservations/schedule"
import type { ReservationZone } from "@/lib/reservations/types"

type QuotaCell = { used: number; web: number }
type QuotaTone = "free" | "partial" | "high" | "none"

type QuotaRow = {
  time: string
  salon: QuotaCell
  terrace: QuotaCell
  people: { salon: number; terrace: number }
}

type QuotaVisit = {
  zone: ReservationZone
  time: string
  partySize: number
}

function clockLabel(total: number) {
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

/** Cupos web ocupados en cada franja. No cuenta mesas físicas ni personas sentadas. */
function webQuotaRows(input: {
  date: string
  week: WeekSchedule
  serviceMinutes: number | null
  web: Record<ReservationZone, number>
  bookings: (HoldBooking & { id: string })[]
  visits?: QuotaVisit[]
  visit?: VisitHours | null
}): QuotaRow[] | null {
  if (input.serviceMinutes === null || input.serviceMinutes <= 0) return null
  const window = openingWindow(input.date, confirmedClock, input.visit, input.week)
  if (!window) return null
  const start = toMinutes(window.opensAt)
  const end = toMinutes(window.closesAt)
  if (start >= end) return null
  const byZone = (zone: ReservationZone) => {
    const record: Record<string, HoldBooking> = {}
    for (const booking of input.bookings) {
      if (booking.zone === zone) record[booking.id] = booking
    }
    return record
  }
  const salonBookings = byZone("salon")
  const terraceBookings = byZone("terrace")
  const minutes: number[] = []
  for (let minute = start; minute < end; minute += reservationConfig.slotMinutes) minutes.push(minute)
  const seen = new Set(minutes)
  for (const visit of input.visits ?? []) {
    if (!/^\d{2}:\d{2}$/.test(visit.time)) continue
    const minute = toMinutes(visit.time)
    if (minute < start || minute >= end || seen.has(minute)) continue
    seen.add(minute)
    minutes.push(minute)
  }
  minutes.sort((left, right) => left - right)
  const peopleAt = (zone: ReservationZone, minute: number) => {
    let people = 0
    for (const visit of input.visits ?? []) {
    if (visit.zone !== zone || !/^\d{2}:\d{2}$/.test(visit.time) || toMinutes(visit.time) !== minute) continue
      if (Number.isInteger(visit.partySize) && visit.partySize > 0) people += visit.partySize
    }
    return people
  }
  const rows: QuotaRow[] = []
  for (const minute of minutes) {
    const until = minute + input.serviceMinutes
    rows.push({
      time: clockLabel(minute),
      salon: { used: occupiedSlots(salonBookings, minute, until), web: input.web.salon },
      terrace: { used: occupiedSlots(terraceBookings, minute, until), web: input.web.terrace },
      people: { salon: peopleAt("salon", minute), terrace: peopleAt("terrace", minute) },
    })
  }
  return rows
}

function quotaTone(cell: QuotaCell): QuotaTone {
  const free = cell.web - cell.used
  if (cell.web <= 0 || free <= 0) return "none"
  if (free < 5) return "partial"
  return "free"
}

export type { QuotaCell, QuotaRow, QuotaTone, QuotaVisit }
export { quotaTone, webQuotaRows }
