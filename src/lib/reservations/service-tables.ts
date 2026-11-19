import type { ReservationZone } from "@/lib/reservations/types"

type ServiceTable = {
  id: string
  label: string
  zone: ReservationZone
  seats: number
  blocked: boolean
  reservable: boolean
}

type ServiceTableChoice = {
  id: string
  label: string
  seats: number
}

type OccupiedTable = {
  tableIds?: string[]
  tableLabel?: string
  startMin: number
  endMin: number
}

function isZone(value: unknown): value is ReservationZone {
  return value === "salon" || value === "terrace"
}

function readServiceTables(data: unknown): ServiceTable[] {
  if (!data || typeof data !== "object" || !Array.isArray((data as { tables?: unknown }).tables)) return []
  const tables: ServiceTable[] = []
  for (const item of (data as { tables: unknown[] }).tables) {
    if (!item || typeof item !== "object") continue
    const table = item as Record<string, unknown>
    if (typeof table.id !== "string" || table.id.length < 1 || table.id.length > 40) continue
    if (!isZone(table.zone)) continue
    if (typeof table.seats !== "number" || !Number.isInteger(table.seats) || table.seats < 1 || table.seats > 30) continue
    const seatsMax = table.seatsMax
    const seats = typeof seatsMax === "number" && Number.isInteger(seatsMax) && seatsMax >= table.seats ? seatsMax : table.seats
    const label = typeof table.label === "string" && table.label.trim() ? table.label.trim().slice(0, 40) : table.id
    tables.push({
      id: table.id,
      label,
      zone: table.zone,
      seats,
      blocked: table.blocked === true,
      reservable: table.reservable !== false,
    })
  }
  return tables
}

function eligibleServiceTables(input: {
  tables: ServiceTable[]
  zone: ReservationZone
  partySize: number
  startMin: number
  endMin: number
  bookings: Record<string, OccupiedTable>
  reservationId: string
}): ServiceTableChoice[] {
  const labels = new Set<string>()
  const ids = new Set<string>()
  for (const [id, booking] of Object.entries(input.bookings)) {
    if (id === input.reservationId) continue
    if (!(booking.startMin < input.endMin && input.startMin < booking.endMin)) continue
    if (booking.tableLabel) labels.add(booking.tableLabel.toLocaleLowerCase("es-CL"))
    for (const tableId of booking.tableIds ?? []) ids.add(tableId)
  }
  return input.tables
    .filter((table) => table.zone === input.zone && !table.blocked && table.reservable && table.seats >= input.partySize)
    .filter((table) => !ids.has(table.id) && !labels.has(table.label.toLocaleLowerCase("es-CL")))
    .map((table) => ({ id: table.id, label: table.label, seats: table.seats }))
}

export { eligibleServiceTables, readServiceTables }
export type { OccupiedTable, ServiceTable, ServiceTableChoice }
