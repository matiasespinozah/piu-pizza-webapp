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
  const meter = text("src/components/features/menu/carta-visit.tsx")
  const route = text("src/app/api/carta/visita/route.ts")
  assert.match(page, /<CartaVisitMeter \/>/)
  assert.doesNotMatch(page, /recordCartaVisit|await fetch/)
  assert.doesNotMatch(meter, /document\.cookie|localStorage|sessionStorage/)
  assert.match(meter, /1000/)
  assert.match(meter, /sendBeacon/)
  assert.match(route, /status: 204/)
  assert.match(route, /catch/)
  assert.match(text("src/server/metrics/carta.ts"), /^import "server-only"/)
  assert.doesNotMatch(text("src/lib/metrics/carta-visit.ts"), /firebase-admin/)
  assert.equal(collections.metricsCarta, "metricsCarta")
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
  assert.match(text("firestore.rules"), /match \/metricsCarta\/\{dayId\} \{\s*allow read, write: if false;/s)
})
