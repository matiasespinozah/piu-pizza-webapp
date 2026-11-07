/** Zona elegida por el cliente. Es una preferencia, no una mesa asignada. */
type ReservationZone = "salon" | "terrace"

/**
 * Lo que el formulario reúne. El servidor vuelve a validarlo antes de guardarlo.
 * El cliente no elige mesa ni estado.
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

/** Estados de una solicitud ya guardada. La mesa solo se asigna al confirmar. */
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
