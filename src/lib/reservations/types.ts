/** Zona elegida por el cliente. Es una preferencia, no una mesa asignada. */
type ReservationZone = "salon" | "terrace"

/**
 * Lo que el formulario reúne. Todavía no se persiste.
 * Los nombres quedan listos para el pedido que enviará el cliente más adelante.
 */
type ReservationRequest = {
  date: string
  preferredTime: string
  partySize: number
  preferredZone: ReservationZone
  customerName: string
  customerPhone: string
  notes: string
}

/**
 * Estados futuros de una solicitud ya guardada.
 * No representan reservas reales en esta etapa.
 */
type ReservationStatus =
  | "pending"
  | "confirmed"
  | "rejected"
  | "reschedule_requested"
  | "cancelled"
  | "arrived"
  | "completed"

type ReservationDraft = {
  date: string
  partySize: number
  zone: ReservationZone | null
  preferredTime: string
  customerName: string
  customerPhone: string
  notes: string
}

type ReservationStep = 1 | 2 | 3

type ReservationField = "date" | "partySize" | "zone" | "preferredTime" | "customerName" | "customerPhone" | "notes"

type ReservationErrors = Partial<Record<ReservationField, string>>

export type {
  ReservationDraft,
  ReservationErrors,
  ReservationField,
  ReservationRequest,
  ReservationStatus,
  ReservationStep,
  ReservationZone,
}
