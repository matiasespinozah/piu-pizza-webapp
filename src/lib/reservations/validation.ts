import { maxPartyFor, reservationConfig } from "@/lib/reservations/configuration"
import { isClosedDay, isPastDate, preferenceSlots } from "@/lib/reservations/schedule"
import type { ReservationDraft, ReservationErrors } from "@/lib/reservations/types"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function validateVisit(draft: ReservationDraft, now = new Date()): ReservationErrors {
  const errors: ReservationErrors = {}

  if (!draft.date) {
    errors.date = "Elige una fecha."
  } else if (!ISO_DATE.test(draft.date) || Number.isNaN(Date.parse(`${draft.date}T12:00:00Z`))) {
    errors.date = "Esa fecha no es válida."
  } else if (isPastDate(draft.date, now)) {
    errors.date = "Elige una fecha de hoy en adelante."
  } else if (isClosedDay(draft.date)) {
    errors.date = "Los domingos no abrimos."
  }

  const partyMax = maxPartyFor(draft.zone)
  if (!Number.isInteger(draft.partySize) || draft.partySize < reservationConfig.partySize.min || draft.partySize > partyMax) {
    const place = draft.zone === "salon" ? "el salón" : "la terraza"
    errors.partySize = draft.zone
      ? `En ${place} se reservan hasta ${partyMax} personas.`
      : `Indica entre ${reservationConfig.partySize.min} y ${partyMax} personas.`
  }

  if (!draft.zone) {
    errors.zone = "Elige salón o terraza."
  }

  return errors
}

function validateTime(draft: ReservationDraft, now = new Date()): ReservationErrors {
  const errors = validateVisit(draft, now)
  if (errors.date) return errors

  const slots = preferenceSlots(draft.date, now)
  if (slots.length === 0) {
    errors.preferredTime = "Hoy ya no quedan horarios de preferencia. Prueba con otro día."
  } else if (!draft.preferredTime) {
    errors.preferredTime = "Elige un horario de preferencia."
  } else if (!slots.includes(draft.preferredTime)) {
    errors.preferredTime = "Ese horario no corresponde al día elegido."
  }

  return errors
}

/** Deja el celular como +56 9 XXXX XXXX, o null si no es un móvil chileno. */
function normalizeChileMobile(value: string) {
  let digits = value.replace(/\D/g, "")
  if (digits.startsWith("56")) digits = digits.slice(2)
  if (digits.length === 9 && digits.startsWith("9")) {
    return `+56 ${digits[0]} ${digits.slice(1, 5)} ${digits.slice(5)}`
  }
  return null
}

function validateContact(draft: ReservationDraft, now = new Date()): ReservationErrors {
  const errors = validateTime(draft, now)
  const name = draft.customerName.trim()

  if (!name) {
    errors.customerName = "Escribe tu nombre."
  } else if (name.length < 2) {
    errors.customerName = "El nombre es demasiado corto."
  } else if (name.length > 80) {
    errors.customerName = "El nombre es demasiado largo."
  }

  if (!draft.customerPhone.trim()) {
    errors.customerPhone = "Escribe tu celular."
  } else if (!normalizeChileMobile(draft.customerPhone)) {
    errors.customerPhone = "Ingresa un celular chileno, por ejemplo +56 9 2887 3619."
  }

  if (draft.notes.trim().length > reservationConfig.notesMaxLength) {
    errors.notes = `Las observaciones pueden tener hasta ${reservationConfig.notesMaxLength} caracteres.`
  }

  return errors
}

export { normalizeChileMobile, validateContact, validateTime, validateVisit }
