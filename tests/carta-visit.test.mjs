import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import { canViewSection } from "@/lib/auth/permissions"
import { collections } from "@/lib/firebase/model"
import {
  applyCartaVisit,
  averageStaySeconds,
  isLikelyBot,
  readCartaBeacon,
  sameSiteOrigin,
} from "@/lib/metrics/carta-visit"
import { applyReservationSaved, applyVisit, readVisitBeacon } from "@/lib/metrics/visit"

function text(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

test("solo cuenta una apertura o un tiempo entero de hasta 30 minutos", () => {
  assert.deepEqual(readCartaBeacon({ kind: "open" }), { kind: "open" })
  assert.deepEqual(readCartaBeacon({ kind: "open", seconds: 99 }), { kind: "open" })
  assert.deepEqual(readCartaBeacon({ kind: "time", seconds: 45 }), { kind: "time", seconds: 45 })
  assert.equal(readCartaBeacon({ kind: "time", seconds: 0 }), null)
  assert.equal(readCartaBeacon({ kind: "time", seconds: 1801 }), null)
  assert.equal(readCartaBeacon({ kind: "time", seconds: 1.5 }), null)
  assert.equal(readCartaBeacon({ kind: "persona", id: "abc" }), null)
  assert.equal(readCartaBeacon(null), null)
})

test("el mismo sitio puede avisar y un bot no escribe", () => {
  assert.equal(sameSiteOrigin("https://piupizzas.cl", "piupizzas.cl"), true)
  assert.equal(sameSiteOrigin("https://evil.example", "piupizzas.cl"), false)
  assert.equal(sameSiteOrigin(null, "piupizzas.cl"), false)
  assert.equal(isLikelyBot("Mozilla/5.0"), false)
  assert.equal(isLikelyBot("Googlebot/2.1"), true)
  assert.equal(isLikelyBot("WhatsApp/2.1"), true)
})

test("dos aperturas y una estadía se suman en el mismo día", () => {
  const once = applyCartaVisit({ opens: 0, engagedSeconds: 0 }, { kind: "open" })
  const twice = applyCartaVisit(once, { kind: "open" })
  const stayed = applyCartaVisit(twice, { kind: "time", seconds: 90 })
  assert.deepEqual(stayed, { opens: 2, engagedSeconds: 90 })
  assert.equal(averageStaySeconds(2, 90), 45)
  assert.equal(averageStaySeconds(0, 90), 0)
})

test("la carta no espera al contador y no guarda cookies", () => {
  const page = text("src/app/carta/page.tsx")
  const meter = text("src/components/features/metrics/visit-meter.tsx")
  const route = text("src/app/api/visitas/route.ts")
  assert.match(page, /<CartaVisitMeter \/>/)
  assert.match(text("src/app/page.tsx"), /<VisitMeter surface="home" \/>/)
  assert.match(text("src/app/reservas/page.tsx"), /<ReservationVisitMeter \/>/)
  assert.match(text("src/components/features/reservations/reservation-form.tsx"), /noteReservationProgress/)
  assert.doesNotMatch(page, /recordCartaVisit|recordVisit|await fetch/)
  assert.doesNotMatch(meter, /document\.cookie|localStorage|sessionStorage/)
  assert.match(meter, /sendBeacon\("\/api\/visitas"/)
  assert.doesNotMatch(meter, /kind: "open"/)
  assert.match(route, /status: 204/)
  assert.match(route, /catch/)
  assert.match(text("src/server/metrics/visits.ts"), /^import "server-only"/)
  assert.doesNotMatch(text("src/lib/metrics/visit.ts"), /firebase-admin/)
  assert.equal(collections.metricsDays, "metricsDays")
})

test("inicio, carta y reserva se suman en un documento y el éxito no sale del navegador", () => {
  assert.equal(readVisitBeacon({ surface: "home", seconds: 12 })?.surface, "home")
  assert.equal(readVisitBeacon({ surface: "carta", seconds: 0 }), null)
  assert.equal(readVisitBeacon({ surface: "reservas", seconds: 8, reached: true, savedSeconds: 5 })?.savedSeconds, 5)
  assert.equal(readVisitBeacon({ surface: "home", seconds: 8, reached: true }), null)
  assert.equal(readVisitBeacon({ surface: "persona", seconds: 8 }), null)
  const home = applyVisit(
    { homeOpens: 0, homeSeconds: 0, cartaOpens: 0, cartaSeconds: 0, reservationOpens: 0, reservationSeconds: 0, reservationReached: 0, reservationSaved: 0, reservationSavedSeconds: 0, reservationSavedSamples: 0 },
    { surface: "home", seconds: 12 }
  )
  const reserva = applyVisit(home, { surface: "reservas", seconds: 40, reached: true, savedSeconds: 25 })
  const saved = applyReservationSaved(reserva)
  assert.equal(saved.homeOpens, 1)
  assert.equal(saved.reservationReached, 1)
  assert.equal(saved.reservationSaved, 1)
  assert.equal(saved.reservationSavedSamples, 1)
  assert.equal(averageStaySeconds(saved.reservationSavedSamples, saved.reservationSavedSeconds), 25)
  const service = text("src/server/reservations/service.ts")
  const savedCall = service.indexOf("await recordReservationSaved()")
  const receivedMail = service.indexOf('kind: "received"')
  assert.ok(savedCall > service.indexOf("if (!outcome.duplicate)") && savedCall < receivedMail)
})

test("solo el propietario consulta la medición", () => {
  assert.equal(canViewSection("superadmin", "metricas"), true)
  assert.equal(canViewSection("admin", "metricas"), false)
  assert.equal(canViewSection("mesero", "metricas"), false)
  const home = text("src/app/admin/(panel)/page.tsx")
  const dashboard = text("src/components/features/admin/admin-dashboard.tsx")
  const metrics = text("src/app/admin/(panel)/metricas/page.tsx")
  assert.match(home, /measure=\{session\.role === "superadmin"\}/)
  assert.match(dashboard, /Medicion de pruebas/)
  assert.match(metrics, /requireSection\("metricas"\)/)
  assert.match(metrics, /Llegaron a Tus datos/)
  assert.match(text("firestore.rules"), /match \/metricsDays\/\{dayId\} \{\s*allow read, write: if false;/s)
})
