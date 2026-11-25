import { todayIsoInSantiago, weekdayOf } from "@/lib/reservations/schedule"
import { whatsappVenues } from "@/lib/site"

/**
 * Eventos de Google Analytics: solo funciones puras que arman nombre y parámetros.
 * Regla: NUNCA nombres, teléfonos, correos, notas, códigos de reserva ni direcciones completas.
 */

type EventParams = Record<string, string | number | boolean | readonly unknown[] | Record<string, unknown>>
type AnalyticsEvent = { name: string; params: EventParams }

const maxText = 100
/** Un correo, o 8 o más dígitos seguidos (un teléfono, un código). */
const looksPrivate = /@|\d[\d\s().-]{6,}\d/
/** Los únicos campos con texto que puede venir de una persona o de un mensaje de error. El resto se arma con valores controlados. */
const freeTextKeys = new Set(["search_term", "description"])

/**
 * Última defensa: el texto largo se recorta y, en los campos de texto libre, lo que parece un correo o un
 * teléfono se descarta. Los números, booleanos y listas de productos (`items`) pasan tal cual.
 */
function cleanParams(params: Record<string, unknown>): EventParams {
  const clean: EventParams = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    if (typeof value === "string") {
      const text = value.trim().slice(0, maxText)
      if (!text || (freeTextKeys.has(key) && looksPrivate.test(text))) continue
      clean[key] = text
    } else if (typeof value === "number") {
      if (Number.isFinite(value)) clean[key] = value
    } else if (typeof value === "boolean" || Array.isArray(value)) {
      clean[key] = value as boolean
    }
  }
  return clean
}

function event(name: string, params: Record<string, unknown> = {}): AnalyticsEvent {
  return { name, params: cleanParams(params) }
}

/** Una ficha de producto abierta. Sirve para saber qué platos despiertan interés. */
function productViewEvent(product: { id: string; name: string; categoryId: string; priceClp: number }) {
  return event("view_item", {
    currency: "CLP",
    value: product.priceClp,
    items: [{ item_id: product.id, item_name: product.name.slice(0, maxText), item_category: product.categoryId, price: product.priceClp, quantity: 1 }],
  })
}

function categoryEvent(category: { id: string; name: string }) {
  return event("view_item_list", { item_list_id: category.id, item_list_name: category.name })
}

/** Lo que busca la gente en la carta. Un término que parece correo o teléfono no se envía. */
function searchEvent(term: string, results: number) {
  const text = term.trim().toLowerCase().slice(0, 40)
  if (text.length < 2 || looksPrivate.test(text)) return null
  return event("search", { search_term: text, results_count: results })
}

const stepNames = { 1: "visita", 2: "horario", 3: "datos" } as const

function reservationStepEvent(step: 1 | 2 | 3) {
  return event("reservation_step", { step, step_name: stepNames[step] })
}

function daysBetween(fromIso: string, toIso: string) {
  const [fy, fm, fd] = fromIso.split("-").map(Number)
  const [ty, tm, td] = toIso.split("-").map(Number)
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000)
}

/**
 * Una solicitud de reserva enviada. Lleva solo lo que sirve para planificar: qué día y hora piden, para cuántos,
 * dónde y con cuánta anticipación. Sin datos del cliente.
 */
function leadEvent(input: { date: string; preferredTime: string; partySize: number; zone: string | null; marketingOptIn: boolean }, now = new Date()) {
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(input.date)
  const hour = /^\d{2}:\d{2}$/.test(input.preferredTime) ? Number(input.preferredTime.slice(0, 2)) : undefined
  return event("generate_lead", {
    lead_type: "reserva",
    party_size: input.partySize,
    zone: input.zone,
    visit_weekday: validDate ? weekdayOf(input.date) : undefined,
    visit_hour: hour,
    days_ahead: validDate ? daysBetween(todayIsoInSantiago(now), input.date) : undefined,
    marketing_opt_in: input.marketingOptIn,
  })
}

/** Por qué no se pudo reservar (cupo lleno, día cerrado, límite…). Solo el código, nunca el mensaje. */
function reservationErrorEvent(code: string | undefined, status: number | "network") {
  return event("reservation_error", { error_code: code ?? "unknown", http_status: status })
}

const venueByPhone = new Map(whatsappVenues.map((venue) => [venue.href.match(/wa\.me\/(\d+)/)?.[1] ?? "", venue.id]))

/**
 * Clasifica un clic en un enlace. Devuelve null si no interesa. Nunca incluye la URL: los enlaces de WhatsApp
 * y de seguimiento pueden llevar un texto o un código.
 */
function linkEvent(href: string, area: string): AnalyticsEvent | null {
  let url: URL
  try {
    url = new URL(href, "https://piupizzas.cl")
  } catch {
    return null
  }
  const host = url.hostname.replace(/^www\./, "")
  if (host === "wa.me") {
    const phone = url.pathname.replace(/\D/g, "")
    return event("click_whatsapp", { link_area: area, venue: venueByPhone.get(phone) ?? "otro" })
  }
  if (host === "google.com" && url.pathname.startsWith("/maps")) {
    return event(url.pathname.startsWith("/maps/dir") ? "click_directions" : "click_map", { link_area: area })
  }
  if (host === "instagram.com") return event("click_social", { network: "instagram", link_area: area })
  if (host === "tiktok.com") return event("click_social", { network: "tiktok", link_area: area })
  if (url.protocol === "tel:") return event("click_phone", { link_area: area })
  if (host === "piupizzas.cl" && url.pathname.startsWith("/reservas/estado")) return event("click_my_reservation", { link_area: area })
  return null
}

/** Rendimiento real de quien visita (LCP, CLS, INP…): para mantener el sitio rápido. */
function webVitalEvent(metric: { name: string; id: string; value: number; delta: number; rating?: string }) {
  return event(metric.name, {
    value: Math.round(metric.name === "CLS" ? metric.delta * 1000 : metric.delta),
    metric_id: metric.id,
    metric_value: metric.value,
    metric_delta: metric.delta,
    metric_rating: metric.rating,
    non_interaction: true,
  })
}

/** Un error de JavaScript en el navegador de un visitante. Sirve para detectar fallos sin que nadie avise. */
function exceptionEvent(message: string, pathname: string, fatal = false) {
  return event("exception", { description: `${message} (${pathname})`.slice(0, maxText), fatal })
}

export {
  categoryEvent,
  cleanParams,
  exceptionEvent,
  leadEvent,
  linkEvent,
  productViewEvent,
  reservationErrorEvent,
  reservationStepEvent,
  searchEvent,
  webVitalEvent,
}
export type { AnalyticsEvent, EventParams }
