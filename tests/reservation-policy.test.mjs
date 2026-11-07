import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import { planAssignment, readCapacity } from "@/lib/reservations/capacity"
import { pendingOwnerDecisions, reservationConfig } from "@/lib/reservations/configuration"
import { ReservationError } from "@/lib/reservations/errors"
import { readPublicBody } from "@/lib/reservations/public-request"
import { isClosedDay, openingWindow, preferenceSlots, todayIsoInSantiago, weekdayOf } from "@/lib/reservations/schedule"
import { canTransition } from "@/lib/reservations/transitions"
import { clientAddress } from "@/lib/reservations/client-address"
import { reservationWritesEnabled } from "@/lib/reservations/writes"
import { requestIsTrusted } from "@/lib/auth/session-policy"

const now = new Date("2026-11-07T18:00:00Z")

function body(overrides = {}) {
  return {
    idempotencyKey: "11111111-1111-4111-8111-111111111111",
    date: "2026-11-09",
    preferredTime: "18:00",
    partySize: 2,
    preferredZone: "salon",
    customerName: "Ana Soto",
    customerPhone: "+56 9 2887 3619",
    notes: "",
    ...overrides,
  }
}

function fails(raw, status) {
  assert.throws(() => readPublicBody(JSON.stringify(raw), now), (error) => error instanceof ReservationError && error.status === status)
}

const salon = { id: "a", zone: "salon", seats: 4, blocked: false }
const blocked = { id: "b", zone: "salon", seats: 4, blocked: true }
const terrace = { id: "c", zone: "terrace", seats: 2, blocked: false }
const config = { serviceMinutes: 90, tables: [salon, blocked, terrace] }

test("el tope usa la dirección que agrega la plataforma, no la primera del cliente", () => {
  assert.equal(clientAddress(null), "unknown")
  assert.equal(clientAddress("203.0.113.10"), "203.0.113.10")
  assert.equal(clientAddress("198.51.100.4, 203.0.113.10"), "203.0.113.10")
  assert.equal(clientAddress(" 1.1.1.1 , 203.0.113.10 "), "203.0.113.10")
})

test("las escrituras de reservas nacen apagadas y no apuntan al proyecto real desde el emulador", () => {
  assert.equal(reservationWritesEnabled({}), false)
  assert.equal(reservationWritesEnabled({ PIU_RESERVATIONS_WRITES: "on" }), false)
  assert.equal(reservationWritesEnabled({ PIU_RESERVATIONS_WRITES: "on", PIU_FIREBASE_DATA: "on" }), true)
  assert.equal(
    reservationWritesEnabled({
      PIU_RESERVATIONS_WRITES: "on",
      FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
      GCLOUD_PROJECT: "piu-pizza-cl",
    }),
    false
  )
  assert.equal(
    reservationWritesEnabled({
      PIU_RESERVATIONS_WRITES: "on",
      FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
      GCLOUD_PROJECT: "demo-piu-pizza",
    }),
    true
  )
  assert.doesNotMatch(readFileSync(new URL("../apphosting.yaml", import.meta.url), "utf8"), /PIU_RESERVATIONS_WRITES|PIU_FIREBASE_DATA/)
})

test("la fecha se calcula en America/Santiago y el domingo está cerrado", () => {
  const probe = new Date("2026-11-08T02:30:00Z")
  const civil = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(probe)
  assert.equal(todayIsoInSantiago(probe), civil)
  assert.notEqual(civil, probe.toISOString().slice(0, 10))
  assert.equal(weekdayOf("2026-11-08"), "sun")
  assert.equal(isClosedDay("2026-11-08"), true)
  assert.equal(openingWindow("2026-11-09")?.opensAt, "17:00")
  assert.equal(openingWindow("2026-11-13")?.opensAt, "13:00")
  const slots = preferenceSlots("2026-11-09", now)
  assert.equal(slots.includes("17:00"), true)
  assert.equal(slots.includes("16:30"), false)
  assert.equal(slots.at(-1) < "22:00", true)
})

test("lo que Felipe no confirmó sigue vacío y no se usa como capacidad", () => {
  assert.equal(reservationConfig.anticipation.weekdayLeadHours, null)
  assert.equal(reservationConfig.anticipation.weekendPreviousDayCutoff, null)
  assert.equal(pendingOwnerDecisions.serviceMinutes, null)
  assert.equal(pendingOwnerDecisions.walkInTables, null)
  assert.equal(pendingOwnerDecisions.combinableTables, null)
  const fixture = { capacityReady: true, fixture: true, serviceMinutes: 90, tables: [salon] }
  assert.equal(readCapacity(fixture, { allowFixture: false }), null)
  assert.equal(readCapacity(fixture, { allowFixture: true })?.serviceMinutes, 90)
  assert.equal(readCapacity({ capacityReady: true, productionReady: true, tables: [salon] }, { allowFixture: false }), null)
})

test("una solicitud válida queda limitada a los datos del cliente", () => {
  const parsed = readPublicBody(JSON.stringify(body()), now)
  assert.equal(parsed.preferredZone, "salon")
  assert.equal("status" in parsed, false)
  fails({ ...body(), status: "confirmed" }, 400)
  fails({ ...body(), assignedTableIds: ["1"] }, 400)
  fails({ ...body(), date: "2020-01-06" }, 422)
  fails({ ...body(), date: "2026-11-08" }, 422)
  fails({ ...body(), preferredTime: "16:30" }, 422)
  fails({ ...body(), customerPhone: "123" }, 422)
  fails({ ...body(), customerName: " " }, 422)
  fails({ ...body(), partySize: 0 }, 422)
  fails({ ...body(), notes: "a".repeat(281) }, 422)
})

test("la mesa se asigna de a una y no se confirma sin configuración", () => {
  assert.equal(planAssignment({ config: null, bookings: {}, zone: "salon", partySize: 2, startMin: 17 * 60 }).reason, "unconfigured")
  const ok = planAssignment({ config, bookings: {}, zone: "salon", partySize: 2, startMin: 17 * 60 })
  assert.equal(ok.ok && ok.tableIds[0], "a")
  assert.equal(planAssignment({ config, bookings: {}, zone: "salon", partySize: 10, startMin: 17 * 60 }).reason, "insufficient")
  assert.equal(
    planAssignment({ config: { serviceMinutes: 90, tables: [blocked] }, bookings: {}, zone: "salon", partySize: 2, startMin: 17 * 60 }).reason,
    "blocked"
  )
  assert.equal(planAssignment({ config, bookings: {}, zone: "terrace", partySize: 4, startMin: 17 * 60 }).reason, "insufficient")
  assert.equal(
    planAssignment({
      config: { serviceMinutes: 90, tables: [salon] },
      bookings: {},
      zone: "terrace",
      partySize: 2,
      startMin: 17 * 60,
    }).reason,
    "zone"
  )
  const busy = { one: { tableIds: ["a"], startMin: 17 * 60, endMin: 18 * 60 + 30, zone: "salon" } }
  assert.equal(planAssignment({ config, bookings: busy, zone: "salon", partySize: 2, startMin: 18 * 60 }).reason, "overlap")
  assert.equal(planAssignment({ config, bookings: busy, zone: "salon", partySize: 2, startMin: 18 * 60 + 30 }).ok, true)
  assert.equal(
    planAssignment({
      config: { serviceMinutes: 90, tables: [salon, { ...salon, id: "d" }] },
      bookings: {},
      zone: "salon",
      partySize: 6,
      startMin: 17 * 60,
    }).reason,
    "insufficient"
  )
})

test("las transiciones cerradas no vuelven atrás", () => {
  assert.equal(canTransition("pending", "confirm"), true)
  assert.equal(canTransition("pending", "reject"), true)
  assert.equal(canTransition("pending", "propose"), true)
  assert.equal(canTransition("confirmed", "cancel"), true)
  assert.equal(canTransition("cancelled", "confirm"), false)
  assert.equal(canTransition("completed", "confirm"), false)
  assert.equal(canTransition("rejected", "confirm"), false)
  assert.equal(canTransition("confirmed", "arrive"), true)
  assert.equal(canTransition("arrived", "complete"), true)
})

test("el cambio administrativo exige el mismo control que el ingreso", () => {
  const route = readFileSync(new URL("../src/app/api/admin/reservations/[id]/route.ts", import.meta.url), "utf8")
  assert.match(route, /requestIsTrusted/)
  assert.match(route, /readStaffGate/)
  assert.equal(
    requestIsTrusted({
      origin: "https://piu.example",
      host: "piu.example",
      forwardedHost: null,
      requestedWith: null,
    }),
    false
  )
  assert.equal(
    requestIsTrusted({
      origin: "https://piu.example",
      host: "piu.example",
      forwardedHost: null,
      requestedWith: "admin-login",
    }),
    true
  )
})
