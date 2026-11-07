import type { ReservationStatus, ReservationZone } from "@/lib/reservations/types"

type ReservationListItem = {
  id: string
  referenceCode: string
  status: ReservationStatus
  date: string
  preferredTime: string
  partySize: number
  preferredZone: ReservationZone
  customerName: string
  createdAt: string
  revision: number
}

type ReservationEvent = {
  action: string
  fromStatus: ReservationStatus | null
  toStatus: ReservationStatus
  actorUid: string | null
  at: string
  reason: string | null
}

type ReservationDetail = ReservationListItem & {
  customerPhone: string
  notes: string
  assignedTableIds: string[]
  proposedDate: string | null
  proposedTime: string | null
  proposedZone: ReservationZone | null
  updatedAt: string
  events: ReservationEvent[]
}

type ReservationSummary = {
  pending: number | null
  confirmedToday: number | null
  upcoming: number | null
  attention: number | null
}

type PublicReceipt = {
  referenceCode: string
  status: "pending"
  date: string
  preferredTime: string
  partySize: number
  preferredZone: ReservationZone
}

const statusLabel: Record<ReservationStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  rejected: "Rechazada",
  reschedule_requested: "Cambio propuesto",
  cancelled: "Cancelada",
  arrived: "Llegó",
  completed: "Finalizada",
}

export type { PublicReceipt, ReservationDetail, ReservationEvent, ReservationListItem, ReservationSummary }
export { statusLabel }
