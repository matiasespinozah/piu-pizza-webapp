import type { ReservationZone } from "@/lib/reservations/types"

type SeatTable = {
  id: string
  zone: ReservationZone
  seats: number
  blocked: boolean
  reservable?: boolean
  combinable?: boolean
}

type CapacityConfig = {
  serviceMinutes: number
  maxCombinedTables?: number
  tables: SeatTable[]
}

type HoldBooking = {
  tableIds: string[]
  startMin: number
  endMin: number
  zone: ReservationZone
}

type CapacityProblem = "unconfigured" | "insufficient" | "blocked" | "unreservable" | "overlap" | "zone"

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
    const seatsMax = table.seatsMax
    const seats =
      typeof seatsMax === "number" && Number.isInteger(seatsMax) && seatsMax >= table.seats ? seatsMax : table.seats
    if (table.blocked !== undefined && typeof table.blocked !== "boolean") return null
    tables.push({
      id: table.id,
      zone: table.zone,
      seats,
      blocked: table.blocked === true,
      reservable: table.reservable !== false,
      combinable: table.combinable === true,
    })
  }

  const maxCombined = record.maxCombinedTables === undefined ? 1 : record.maxCombinedTables
  if (typeof maxCombined !== "number" || !Number.isInteger(maxCombined) || maxCombined < 1 || maxCombined > 4) return null

  return { serviceMinutes: record.serviceMinutes, maxCombinedTables: maxCombined, tables }
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

  const open = inZone.filter((table) => !table.blocked && table.reservable !== false)
  if (open.length === 0) {
    return { ok: false, reason: inZone.every((table) => table.blocked) ? "blocked" : "unreservable" }
  }

  const busy = new Set<string>()
  for (const [id, booking] of Object.entries(input.bookings)) {
    if (id === input.ignoreReservationId) continue
    const overlaps = booking.startMin < endMin && input.startMin < booking.endMin
    if (!overlaps) continue
    for (const tableId of booking.tableIds) busy.add(tableId)
  }

  const free = open.filter((table) => !busy.has(table.id) && table.seats >= input.partySize)
  free.sort((a, b) => a.seats - b.seats || a.id.localeCompare(b.id))
  const single = free[0]
  if (single) return { ok: true, tableIds: [single.id], endMin }

  const maxCombined = input.config.maxCombinedTables ?? 1
  if (maxCombined >= 2) {
    const pool = open.filter((table) => table.combinable && !busy.has(table.id))
    const joined = bestCombination(pool, input.partySize, maxCombined)
    if (joined) return { ok: true, tableIds: joined, endMin }
  }

  const fitting = open.filter((item) => item.seats >= input.partySize || (item.combinable && maxCombined >= 2))
  if (fitting.length === 0) return { ok: false, reason: "insufficient" }
  return { ok: false, reason: "overlap" }
}

function bestCombination(tables: SeatTable[], partySize: number, maxTables: number) {
  const found: { best: SeatTable[] | null } = { best: null }
  const chosen: SeatTable[] = []

  function walk(start: number) {
    if (chosen.length >= 2) {
      const seats = chosen.reduce((sum, table) => sum + table.seats, 0)
      if (seats >= partySize && better(chosen, found.best)) found.best = chosen.slice()
    }
    if (chosen.length === maxTables) return
    for (let index = start; index < tables.length; index += 1) {
      chosen.push(tables[index])
      walk(index + 1)
      chosen.pop()
    }
  }

  walk(0)
  return found.best?.map((table) => table.id) ?? null
}

function better(next: SeatTable[], current: SeatTable[] | null) {
  if (!current) return true
  const nextSeats = next.reduce((sum, table) => sum + table.seats, 0)
  const currentSeats = current.reduce((sum, table) => sum + table.seats, 0)
  if (nextSeats !== currentSeats) return nextSeats < currentSeats
  if (next.length !== current.length) return next.length < current.length
  return next.map((table) => table.id).join() < current.map((table) => table.id).join()
}

export { planAssignment, readCapacity }
export type { CapacityConfig, HoldBooking }
