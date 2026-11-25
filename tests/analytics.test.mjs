import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { analyticsActive, consentDefault, googleSignals, trackablePath } from "@/lib/analytics/config"
import {
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
} from "@/lib/analytics/events"
import { trackEvent } from "@/lib/analytics/track"

const text = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")

test("no se mide el panel, las APIs, el seguimiento de reservas ni las rutas de desarrollo", () => {
  for (const path of ["/", "/carta", "/reservas", "/nosotros", "/carta#pizzas", "/administracion", "/reservas-info"]) {
    assert.equal(trackablePath(path), true, path)
  }
  for (const path of ["/admin", "/admin/login", "/admin/reservas/historial", "/api/reservations", "/reservas/estado", "/reservas/estado/", "/correo", "/ui", "", null, undefined, "carta"]) {
    assert.equal(trackablePath(path), false, String(path))
  }
})

test("fuera de producción o sin ID de medición no se carga nada", () => {
  assert.equal(analyticsActive, false)
  // Sin window ni ID: no hace nada y no lanza.
  assert.doesNotThrow(() => trackEvent({ name: "page_view", params: {} }))
  assert.doesNotThrow(() => trackEvent(null))
})

test("el consentimiento de hoy es medición básica sin publicidad ni señales de Google", () => {
  assert.equal(consentDefault.analytics_storage, "granted")
  assert.equal(consentDefault.ad_storage, "denied")
  assert.equal(consentDefault.ad_user_data, "denied")
  assert.equal(consentDefault.ad_personalization, "denied")
  assert.equal(googleSignals, false)
})

test("un clic a WhatsApp se mide por local y nunca envía la dirección ni el texto del mensaje", () => {
  const withName = "https://wa.me/56928873619?text=" + encodeURIComponent("Hola, soy Juan Pérez, mi teléfono es 912345678")
  const restaurant = linkEvent(withName, "pie")
  assert.deepEqual(restaurant, { name: "click_whatsapp", params: { link_area: "pie", venue: "restaurant" } })
  assert.equal(JSON.stringify(restaurant).includes("Juan"), false)
  assert.equal(JSON.stringify(restaurant).includes("912345678"), false)
  assert.equal(linkEvent("https://wa.me/56927214013?text=hola", "flotante").params.venue, "casa")
  assert.equal(linkEvent("https://wa.me/56900000000", "contenido").params.venue, "otro")
})

test("mapas, redes y teléfono se clasifican, y «Mi reserva» no revela el código secreto", () => {
  assert.equal(linkEvent("https://www.google.com/maps/dir/?api=1&destination=x", "contenido").name, "click_directions")
  assert.equal(linkEvent("https://www.google.com/maps/search/?api=1&query=x", "contenido").name, "click_map")
  assert.deepEqual(linkEvent("https://www.instagram.com/piupizzas.cl/?hl=es", "pie").params, { network: "instagram", link_area: "pie" })
  assert.equal(linkEvent("https://www.tiktok.com/@piupizzas.cl", "pie").params.network, "tiktok")
  assert.equal(linkEvent("tel:+56928873619", "contenido").name, "click_phone")
  const mine = linkEvent("https://piupizzas.cl/reservas/estado?t=CODIGO-SECRETO-123", "encabezado")
  assert.equal(mine.name, "click_my_reservation")
  assert.equal(JSON.stringify(mine).includes("CODIGO"), false)
  // Lo que no interesa no se mide.
  assert.equal(linkEvent("/carta", "contenido"), null)
  assert.equal(linkEvent("https://ejemplo.cl/", "contenido"), null)
  assert.equal(linkEvent("http://[", "contenido"), null)
})

test("una solicitud de reserva lleva solo datos de planificación, nunca del cliente", () => {
  const now = new Date("2026-11-25T15:00:00Z")
  const lead = leadEvent({ date: "2026-12-05", preferredTime: "20:30", partySize: 4, zone: "terrace", marketingOptIn: true }, now)
  assert.deepEqual(lead, {
    name: "generate_lead",
    params: { lead_type: "reserva", party_size: 4, zone: "terrace", visit_weekday: "sat", visit_hour: 20, days_ahead: 10, marketing_opt_in: true },
  })
  // Sin zona o con una fecha mal formada, simplemente falta ese dato.
  const partial = leadEvent({ date: "no-es-fecha", preferredTime: "tarde", partySize: 2, zone: null, marketingOptIn: false }, now)
  assert.deepEqual(Object.keys(partial.params).sort(), ["lead_type", "marketing_opt_in", "party_size"])
  // El código del evento ni siquiera sabe que existen estos datos.
  for (const forbidden of ["customerName", "customerPhone", "customerEmail", "notes"]) {
    assert.equal(text("src/lib/analytics/events.ts").includes(forbidden), false, forbidden)
  }
  const form = text("src/components/features/reservations/reservation-form.tsx")
  const call = form.slice(form.indexOf("leadEvent({"), form.indexOf("leadEvent({") + 400)
  assert.equal(/customer|notes/.test(call), false)
})

test("los errores de reserva envían solo el código, no el mensaje", () => {
  assert.deepEqual(reservationErrorEvent("quota", 409), { name: "reservation_error", params: { error_code: "quota", http_status: 409 } })
  assert.deepEqual(reservationErrorEvent(undefined, "network").params, { error_code: "unknown", http_status: "network" })
  assert.deepEqual(reservationStepEvent(2), { name: "reservation_step", params: { step: 2, step_name: "horario" } })
})

test("ver un producto envía su nombre, categoría y precio para saber qué platos interesan", () => {
  const view = productViewEvent({ id: "p1", name: "Margherita", categoryId: "pizzas", priceClp: 9900 })
  assert.equal(view.name, "view_item")
  assert.equal(view.params.value, 9900)
  assert.deepEqual(view.params.items, [{ item_id: "p1", item_name: "Margherita", item_category: "pizzas", price: 9900, quantity: 1 }])
  assert.deepEqual(categoryEvent({ id: "c1", name: "Pizzas" }), { name: "view_item_list", params: { item_list_id: "c1", item_list_name: "Pizzas" } })
})

test("la búsqueda de la carta ignora lo muy corto y lo que parece un dato personal", () => {
  assert.deepEqual(searchEvent("  Margherita ", 3), { name: "search", params: { search_term: "margherita", results_count: 3 } })
  assert.equal(searchEvent("a", 1), null)
  assert.equal(searchEvent("juan@correo.cl", 0), null)
  assert.equal(searchEvent("912345678", 0), null)
  assert.equal(searchEvent("+56 9 1234 5678", 0), null)
  assert.equal(searchEvent("x".repeat(200), 0).params.search_term.length, 40)
})

test("las métricas de rendimiento conservan su identificador y CLS se escala", () => {
  const lcp = webVitalEvent({ name: "LCP", id: "v5-1700000000000-1234567890123", value: 2312.4, delta: 2312.4, rating: "good" })
  assert.equal(lcp.name, "LCP")
  assert.equal(lcp.params.value, 2312)
  assert.equal(lcp.params.metric_id, "v5-1700000000000-1234567890123")
  assert.equal(lcp.params.metric_rating, "good")
  assert.equal(lcp.params.non_interaction, true)
  assert.equal(webVitalEvent({ name: "CLS", id: "a", value: 0.0421, delta: 0.0421 }).params.value, 42)
})

test("los errores de JavaScript se recortan y descartan lo que parece un correo", () => {
  assert.equal(exceptionEvent("x".repeat(500), "/carta").params.description.length, 100)
  assert.equal(exceptionEvent("Cannot read properties of undefined", "/carta").params.description, "Cannot read properties of undefined (/carta)")
  assert.equal("description" in exceptionEvent("falló para juan@correo.cl", "/carta").params, false)
})

test("la limpieza de parámetros quita lo vacío y lo no finito, y deja listas y booleanos", () => {
  assert.deepEqual(cleanParams({ a: "ok", b: "", c: null, d: undefined, e: Number.NaN, f: 3, g: false, h: [1], i: "  espacio  " }), { a: "ok", f: 3, g: false, h: [1], i: "espacio" })
})
