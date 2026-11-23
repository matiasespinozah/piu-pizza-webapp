import { normalizeReservationEmail } from "@/lib/reservations/email"
import { admitRequest, visitException, type DayOverride } from "@/lib/reservations/day-policy"
import { maxPartyFor, requiredLeadHours, reservationConfig } from "@/lib/reservations/configuration"
import type { OperationRules } from "@/lib/reservations/operations"
import { instantInSantiago, isClosedDay, isPastDate, preferenceSlots, previousIso, santiagoParts, toMinutes, weekdayOf, type ReservationClock, type WeekSchedule } from "@/lib/reservations/schedule"
import type { ReservationDraft, ReservationErrors } from "@/lib/reservations/types"

type VisitRules = {
  clock?: ReservationClock
  week?: WeekSchedule
  anticipation?: OperationRules["anticipation"]
  maxParty?: OperationRules["maxParty"]
  /** La reserva del personal no usa el tope de personas del cliente. */
  skipPartyLimit?: boolean
  receptionPaused?: boolean
  receptionNotice?: OperationRules["receptionNotice"]
  notices?: OperationRules["notices"]
  day?: DayOverride | null
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function validateVisit(draft: ReservationDraft, now = new Date(), rules?: VisitRules): ReservationErrors {
  const errors: ReservationErrors = {}

  if (!draft.date) {
    errors.date = "Elige una fecha."
  } else if (!ISO_DATE.test(draft.date) || Number.isNaN(Date.parse(`${draft.date}T12:00:00Z`))) {
    errors.date = "Esa fecha no es válida."
  } else if (isPastDate(draft.date, now)) {
    errors.date = "Elige una fecha de hoy en adelante."
  } else if (rules?.clock) {
    const admission = admitRequest(
      {
        clock: rules.clock,
        receptionPaused: rules.receptionPaused === true,
        receptionNotice: rules.receptionNotice,
        notices: rules.notices ?? { full: { enabled: false, text: "" }, paused: { enabled: false, text: "" }, closedDay: { enabled: false, text: "" }, venueClosed: { enabled: false, text: "" } },
        week: rules.week,
      },
      rules.day ?? null,
      draft.date,
    )
    if (!admission.ok) errors.date = admission.message
  } else if (isClosedDay(draft.date)) {
    errors.date = "Los domingos no abrimos."
  }

  const partyMax = partyLimit(draft.zone, rules?.maxParty)
  if (
    rules?.skipPartyLimit !== true &&
    (!Number.isInteger(draft.partySize) || draft.partySize < reservationConfig.partySize.min || draft.partySize > partyMax)
  ) {
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

function validateTime(draft: ReservationDraft, now = new Date(), rules?: VisitRules): ReservationErrors {
  const errors = validateVisit(draft, now, rules)
  if (errors.date) return errors

  const visit = visitException(rules?.day ?? null)
  const open = preferenceSlots(draft.date, now, rules?.clock, visit, rules?.week, 0)
  if (open.length === 0) {
    errors.preferredTime = "Hoy ya no quedan horarios de preferencia. Prueba con otro día."
  } else if (!draft.preferredTime) {
    errors.preferredTime = "Elige un horario de preferencia."
  } else if (!open.includes(draft.preferredTime)) {
    errors.preferredTime = "Ese horario no corresponde al día elegido."
  } else {
    const anticipation = anticipationError(draft, now, rules?.anticipation)
    if (anticipation) errors.preferredTime = anticipation
  }

  return errors
}

function staffPartyException(zone: "salon" | "terrace", partySize: number, maxParty: OperationRules["maxParty"]) {
  const cap = zone === "terrace" ? maxParty.terrace : maxParty.salon
  if (!Number.isInteger(partySize) || partySize <= cap) return ""
  const place = zone === "terrace" ? "la terraza" : "el salón"
  return `Excepción de administración: en ${place} el cliente reserva hasta ${cap} personas. Desde el panel esta reserva puede seguir.`
}

function partyLimit(zone: ReservationDraft["zone"], maxParty?: OperationRules["maxParty"]) {
  if (!maxParty) return maxPartyFor(zone)
  if (zone === "terrace") return maxParty.terrace
  if (zone === "salon") return maxParty.salon
  return Math.max(maxParty.salon, maxParty.terrace)
}

function anticipationError(
  draft: ReservationDraft,
  now: Date,
  anticipation?: { weekdayLeadHours: number | null; weekendPreviousDayCutoff: string | null },
) {
  if (!draft.preferredTime) return null
  const day = weekdayOf(draft.date)
  if ((day === "fri" || day === "sat") && anticipation?.weekendPreviousDayCutoff) {
    const previous = previousIso(draft.date)
    const current = santiagoParts(now)
    if (current.iso > previous || (current.iso === previous && current.minutes > toMinutes(anticipation.weekendPreviousDayCutoff))) {
      return "El viernes y el sábado hay que pedir la mesa el día anterior, antes del horario definido."
    }
  }
  const hours = requiredLeadHours(anticipation?.weekdayLeadHours)
  const slot = instantInSantiago(draft.date, draft.preferredTime)
  if (slot.getTime() - now.getTime() < hours * 60 * 60 * 1000) {
    return `Para reservar a las ${draft.preferredTime} hay que pedirlo al menos ${hours} horas antes.`
  }
  return null
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

function validateContact(
  draft: ReservationDraft,
  now = new Date(),
  rules?: VisitRules,
): ReservationErrors {
  const errors = validateTime(draft, now, rules)
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
  } else   if (!normalizeChileMobile(draft.customerPhone)) {
    errors.customerPhone = "Ingresa un celular chileno, por ejemplo +56 9 2887 3619."
  }

  const email = normalizeReservationEmail(draft.customerEmail)
  if ("error" in email) errors.customerEmail = email.error

  if (draft.notes.trim().length > reservationConfig.notesMaxLength) {
    errors.notes = `Las observaciones pueden tener hasta ${reservationConfig.notesMaxLength} caracteres.`
  }

  return errors
}

export { normalizeChileMobile, staffPartyException, validateContact, validateTime, validateVisit }
export type { VisitRules }
