import type { ReservationZone } from "@/lib/reservations/types"

type ServiceReservation = {
  id: string
  referenceCode: string
  status: "confirmed" | "arrived" | "completed"
  date: string
  preferredTime: string
  partySize: number
  preferredZone: ReservationZone
  customerName: string
  notes: string
  tableLabel: string | null
  internalNotes: string
  revision: number
}

type ServiceBoard = {
  ready: boolean
  indexError: boolean
  today: string
  arriving: ServiceReservation[]
  serving: ServiceReservation[]
  finished: ServiceReservation[]
}

export type { ServiceBoard, ServiceReservation }
