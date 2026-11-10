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
  const rows: QuotaRow[] = []
  for (let minute = start; minute < end; minute += reservationConfig.slotMinutes) {
    const until = minute + input.serviceMinutes
    rows.push({
      time: clockLabel(minute),
      salon: { used: occupiedSlots(salonBookings, minute, until), web: input.web.salon },
      terrace: { used: occupiedSlots(terraceBookings, minute, until), web: input.web.terrace },
    })
  }
  return rows
}

function quotaTone(cell: QuotaCell): QuotaTone {
  if (cell.web <= 0) return "none"
  const ratio = cell.used / cell.web
  if (ratio >= 0.8) return "high"
  if (ratio >= 0.4) return "partial"
  return "free"
}

export type { QuotaCell, QuotaRow, QuotaTone }
export { quotaTone, webQuotaRows }
