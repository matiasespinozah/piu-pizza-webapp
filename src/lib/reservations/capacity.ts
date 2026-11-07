import type { ReservationZone } from "@/lib/reservations/types"

type SeatTable = {
  id: string
  zone: ReservationZone
  seats: number
  blocked: boolean
}

type HoldBooking = {
  tableIds: string[]
  startMin: number
  endMin: number
  zone: ReservationZone
}

type CapacityConfig = {
  serviceMinutes: number
  tables: SeatTable[]
}

type CapacityProblem = "unconfigured" | "insufficient" | "blocked" | "overlap" | "zone"

type Assignment =
  | { ok: true; tableIds: string[]; endMin: number }
  | { ok: false; reason: CapacityProblem }

function isZone(value: unknown): value is ReservationZone {
  return value === "salon" || value === "terrace"
}

/**
 * Lee la configuración de mesas. En producción solo vale `productionReady`.
 * `fixture` existe para el emulador y no habilita el restaurante real.
 */
function readCapacity(data: unknown, options: { allowFixture: boolean }): CapacityConfig | null {
  if (!data || typeof data !== "object") return null
  const record = data as Record<string, unknown>
  const ready = record.productionReady === true || (options.allowFixture && record.fixture === true)
  if (!ready || record.capacityReady !== true) return null
  if (typeof record.serviceMinutes !== "number" || !Number.isInteger(record.serviceMinutes) || record.serviceMinutes <= 0) {
    return null
  }
  if (!Array.isArray(record.tables) || record.tables.length === 0) return null

  const tables: SeatTable[] = []
  for (const item of record.tables) {
    if (!item || typeof item !== "object") return null
    const table = item as Record<string, unknown>
    if (typeof table.id !== "string" || table.id.length < 1 || table.id.length > 40) return null
    if (!isZone(table.zone)) return null
    if (typeof table.seats !== "number" || !Number.isInteger(table.seats) || table.seats <= 0) return null
    if (typeof table.blocked !== "boolean") return null
    tables.push({ id: table.id, zone: table.zone, seats: table.seats, blocked: table.blocked })
  }

  return { serviceMinutes: record.serviceMinutes, tables }
}

function planAssignment(input: {
  config: CapacityConfig | null
  bookings: Record<string, HoldBooking>
  ignoreReservationId?: string
  zone: ReservationZone
  partySize: number
  startMin: number
}): Assignment {
  if (!input.config) return { ok: false, reason: "unconfigured" }

  const endMin = input.startMin + input.config.serviceMinutes
  const inZone = input.config.tables.filter((table) => table.zone === input.zone)
  if (inZone.length === 0) return { ok: false, reason: "zone" }

  const open = inZone.filter((table) => !table.blocked)
  if (open.length === 0) return { ok: false, reason: "blocked" }

  const busy = new Set<string>()
  for (const [id, booking] of Object.entries(input.bookings)) {
    if (id === input.ignoreReservationId) continue
    const overlaps = booking.startMin < endMin && input.startMin < booking.endMin
    if (!overlaps) continue
    for (const tableId of booking.tableIds) busy.add(tableId)
  }

  // Una mesa por reserva. Juntar mesas sigue pendiente: no se suman puestos.
  const free = open.filter((table) => !busy.has(table.id) && table.seats >= input.partySize)
  free.sort((a, b) => a.seats - b.seats || a.id.localeCompare(b.id))
  const table = free[0]
  if (table) return { ok: true, tableIds: [table.id], endMin }

  const fitting = open.filter((item) => item.seats >= input.partySize)
  if (fitting.length === 0) return { ok: false, reason: "insufficient" }
  return { ok: false, reason: "overlap" }
}

export { planAssignment, readCapacity }
export type { CapacityConfig, HoldBooking }
