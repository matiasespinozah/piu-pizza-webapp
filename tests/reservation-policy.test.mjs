import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import { planAssignment, readCapacity } from "@/lib/reservations/capacity"
import { admitRequest, quotaReason } from "@/lib/reservations/day-policy"
import { applyFloorSection, criticalFingerprint, declaredTables, defaultOperationRules, informedGroups, knownSingleTableSeats, operationsDocument, readinessIssues, readOperationRules } from "@/lib/reservations/operations"
import { pendingOwnerDecisions, reservationConfig } from "@/lib/reservations/configuration"
import { ReservationError } from "@/lib/reservations/errors"
import { readPublicBody } from "@/lib/reservations/public-request"
import { confirmedClock, defaultWeek, isClosedDay, openingWindow, preferenceSlots, todayIsoInSantiago, weekdayOf } from "@/lib/reservations/schedule"
import { canTransition } from "@/lib/reservations/transitions"
import { clientAddress } from "@/lib/reservations/client-address"
import { createTrackingSecret, hashTrackingSecret, trackingExpired, trackingExpiresOn, unwrapTrackingSecret, wrapTrackingSecret } from "@/lib/reservations/tracking"
import { claimPublicReference, formatPublicReference } from "@/lib/reservations/reference"
import { parseTrackingCredential, publicReservationStatus } from "@/lib/reservations/tracking-link"
import { reservationStatusEnabled, reservationWritesEnabled } from "@/lib/reservations/writes"
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
  assert.doesNotMatch(readFileSync(new URL("../apphosting.yaml", import.meta.url), "utf8"), /PIU_RESERVATIONS_WRITES|PIU_FIREBASE_DATA|PIU_RESERVATION_STATUS/)
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

test("juntar mesas solo ocurre cuando la regla y las mesas lo permiten", () => {
  const pair = [
    { id: "a", zone: "salon", seats: 4, blocked: false, combinable: true },
    { id: "d", zone: "salon", seats: 4, blocked: false, combinable: true },
  ]
  const open = { serviceMinutes: 90, maxCombinedTables: 2, tables: pair }
  const joined = planAssignment({ config: open, bookings: {}, zone: "salon", partySize: 6, startMin: 17 * 60 })
  assert.equal(joined.ok && joined.tableIds.join(), "a,d")
  assert.equal(
    planAssignment({
      config: { ...open, maxCombinedTables: 1 },
      bookings: {},
      zone: "salon",
      partySize: 6,
      startMin: 17 * 60,
    }).reason,
    "insufficient",
  )
  const busy = { one: { tableIds: ["a"], startMin: 17 * 60, endMin: 18 * 60 + 30, zone: "salon" } }
  assert.equal(planAssignment({ config: open, bookings: busy, zone: "salon", partySize: 6, startMin: 17 * 60 }).reason, "overlap")
  const closed = { ...open, tables: pair.map((table) => ({ ...table, reservable: false })) }
  assert.equal(planAssignment({ config: closed, bookings: {}, zone: "salon", partySize: 2, startMin: 17 * 60 }).reason, "unreservable")
})

test("la configuración inicial no inventa mesas y deja los cupos de salón y terraza", () => {
  const document = operationsDocument(defaultOperationRules())
  assert.equal(document.productionReady, false)
  assert.equal(document.capacityReady, true)
  assert.equal(document.walkInTables, null)
  assert.equal(document.serviceMinutes, 90)
  assert.equal(document.sectors.salon.total, 19)
  assert.equal(document.sectors.salon.web, 19)
  assert.equal(document.sectors.terrace.total, 15)
  assert.equal(document.sectors.terrace.web, 15)
  assert.equal(document.week.sun.open, false)
  assert.equal(document.week.mon.opensAt, "17:00")
  assert.equal(document.week.mon.closesAt, "22:00")
  assert.equal(document.week.fri.opensAt, "13:00")
  assert.equal(document.week.fri.closesAt, "23:00")
  assert.equal(document.dailyLimit.mode, "unset")
  assert.equal(document.tables.length, 0)
  const salonInformed = informedGroups.salon.of4 + informedGroups.salon.of3 + informedGroups.salon.of2
  const terraceInformed = informedGroups.terrace.of4 + informedGroups.terrace.of2
  assert.equal(declaredTables.salon - salonInformed, 8)
  assert.equal(declaredTables.terrace - terraceInformed, 6)
  const slots = preferenceSlots("2026-11-09", now, { ...confirmedClock, lastSeatingTime: "21:00" })
  assert.equal(slots.at(-1), "21:00")
  assert.equal(slots.includes("21:30"), false)
})

test("los cupos simultáneos respetan la duración y dejan pendiente un grupo grande", () => {
  const document = operationsDocument({
    ...defaultOperationRules(),
    sectors: {
      salon: { total: 19, web: 2 },
      terrace: { total: 15, web: 1 },
    },
  })
  const config = readCapacity(document, { allowFixture: false })
  assert.equal(config?.sectors?.salon, 2)
  const first = planAssignment({ config, bookings: {}, zone: "salon", partySize: 4, startMin: 17 * 60 })
  assert.equal(first.ok, true)
  assert.deepEqual(first.ok && first.tableIds, [])
  assert.equal(first.ok && first.endMin, 18 * 60 + 30)
  const busy = {
    one: { tableIds: [], slots: 1, startMin: 17 * 60, endMin: 18 * 60 + 30, zone: "salon" },
    two: { tableIds: ["vieja"], startMin: 17 * 60 + 30, endMin: 19 * 60, zone: "salon" },
  }
  assert.equal(planAssignment({ config, bookings: busy, zone: "salon", partySize: 2, startMin: 18 * 60 }).reason, "overlap")
  assert.equal(planAssignment({ config, bookings: busy, zone: "salon", partySize: 2, startMin: 19 * 60 }).ok, true)
  assert.equal(planAssignment({ config, bookings: {}, zone: "salon", partySize: knownSingleTableSeats + 1, startMin: 17 * 60 }).reason, "manual")
  const kept = readOperationRules({
    clock: { weekday: { opensAt: "18:00", closesAt: "22:00" }, weekend: { opensAt: "12:00", closesAt: "23:00" }, lastSeatingTime: null },
    tables: [{ id: "mesa-1", label: "Mesa 1", zone: "salon", seats: 4, seatsMax: null, blocked: false, reservable: true, combinable: false, smoker: false }],
    serviceMinutes: 90,
  })
  assert.equal(kept?.tables.length, 1)
  assert.equal(kept?.week.mon.opensAt, "18:00")
  assert.equal(kept?.sectors.salon.total, 1)
  const migrated = operationsDocument({
    ...defaultOperationRules(),
    tables: kept?.tables ?? [],
    sectors: { salon: { total: 19, web: 10 }, terrace: { total: 15, web: 8 } },
  })
  assert.equal(migrated.tables.length, 1)
  assert.equal(migrated.sectors.salon.web, 10)
  const custom = readOperationRules({
    ...operationsDocument(defaultOperationRules()),
    week: { ...defaultWeek(), sun: { open: true, opensAt: "13:00", closesAt: "18:00" } },
  })
  assert.equal(openingWindow("2026-11-08", custom?.clock, null, custom?.week)?.opensAt, "13:00")
})

test("pausar, cerrar un día y los topes no confirman de más", () => {
  const rules = defaultOperationRules()
  const monday = "2026-11-09"
  assert.equal(admitRequest({ ...rules, receptionPaused: true }, null, monday).code, "paused")
  assert.equal(admitRequest(rules, { ...rules, date: monday, closed: true, full: false, hours: null, lastSeatingTime: null, daily: { mode: "inherit", max: null }, slot: { mode: "inherit", max: null }, notice: null, updatedBy: null, updatedAt: null }, monday).ok, false)
  const bookings = [{ tableIds: ["a"], startMin: 17 * 60, endMin: 18 * 60 + 30, zone: "salon" }]
  assert.equal(quotaReason(bookings, 19 * 60, 1, null), "daily")
  assert.equal(quotaReason(bookings, 17 * 60, null, 1), "slot")
  assert.equal(quotaReason(bookings, 19 * 60, null, 1), null)
  const ready = {
    ...rules,
    clock: { ...rules.clock, lastSeatingTime: "21:00" },
    anticipation: { weekdayLeadHours: 2, weekendPreviousDayCutoff: "18:00" },
    dailyLimit: { mode: "none", max: null },
    slotLimit: { mode: "none", max: null },
    walkInTables: 0,
    tables: [{ id: "mesa-1", label: "Mesa 1", zone: "salon", seats: 4, seatsMax: null, blocked: false, reservable: true, combinable: false, smoker: false }],
  }
  assert.equal(readinessIssues(ready).length, 0)
  const fingerprint = criticalFingerprint(ready)
  assert.equal(operationsDocument({ ...ready, productionReady: true, validatedFingerprint: fingerprint }).productionReady, true)
  assert.equal(operationsDocument({ ...ready, productionReady: true, validatedFingerprint: fingerprint, serviceMinutes: 60 }).productionReady, false)
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

test("el seguimiento no se enciende con las escrituras y el secreto no sale de campos públicos", () => {
  assert.equal(reservationStatusEnabled({}), false)
  assert.equal(reservationStatusEnabled({ PIU_RESERVATION_STATUS: "on" }), false)
  assert.equal(reservationStatusEnabled({ PIU_RESERVATION_STATUS: "on", PIU_RESERVATIONS_WRITES: "on" }), false)
  assert.equal(reservationStatusEnabled({ PIU_RESERVATION_STATUS: "on", FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080" }), true)
  assert.equal(reservationStatusEnabled({ PIU_RESERVATION_STATUS: " ON ", PIU_FIREBASE_DATA: "on" }), true)
  assert.equal(reservationStatusEnabled({ PIU_RESERVATION_STATUS: "true", PIU_FIREBASE_DATA: "on" }), false)
  assert.equal(
    reservationStatusEnabled({
      PIU_RESERVATION_STATUS: "on",
      FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
      GCLOUD_PROJECT: "piu-pizza-cl",
    }),
    false
  )
  assert.equal(pendingOwnerDecisions.retentionPolicy, null)
  assert.equal(reservationConfig.trackingLinkGraceDays, 2)
  assert.equal(trackingExpiresOn("2026-11-09"), "2026-11-11")
  assert.equal(trackingExpired("2026-11-11", new Date("2026-11-11T18:00:00Z")), false)
  assert.equal(trackingExpired("2026-11-11", new Date("2026-11-12T15:00:00Z")), true)

  const token = createTrackingSecret()
  assert.equal(token.length, 43)
  assert.notEqual(hashTrackingSecret(token), token)
  const key = "11111111-1111-4111-8111-111111111111"
  assert.equal(unwrapTrackingSecret(wrapTrackingSecret(token, key), key), token)
  assert.equal(unwrapTrackingSecret(wrapTrackingSecret(token, key), "otra-clave-distinta-de-32"), null)

  assert.equal(parseTrackingCredential("PIU-ABCD2345").kind, "reference")
  assert.equal(parseTrackingCredential("PIU-2021").kind, "reference")
  assert.equal(formatPublicReference(2021), "PIU-2021")
  assert.equal(formatPublicReference(7), "PIU-0007")
  assert.equal(claimPublicReference(new Set(["PIU-2021"]), () => 2021), null)
  const sequence = [2021, 2021, 4410]
  assert.equal(
    claimPublicReference(new Set(["PIU-2021"]), () => sequence.shift() ?? 0),
    "PIU-4410",
  )
  assert.equal(parseTrackingCredential("https://piu.example/reservas/estado?token=" + token).kind, "malformed")
  assert.deepEqual(parseTrackingCredential(`https://piu.example/reservas/estado#${token}`), { kind: "token", token })

  const dto = publicReservationStatus({
    referenceCode: "PIU-ABCD2345",
    status: "reschedule_requested",
    date: "2026-11-09",
    preferredTime: "18:00",
    partySize: 2,
    preferredZone: "salon",
    updatedAt: "2026-11-07T18:00:00.000Z",
    proposedDate: "2026-11-10",
    proposedTime: "19:00",
    proposedZone: "terrace",
    customerName: "Ana Soto",
    customerPhone: "+56 9 2887 3619",
    notes: "cumpleaños",
    assignedTableIds: ["mesa-1"],
    confirmedBy: "staff-admin",
    rejectionReason: "motivo interno",
    trackingId: hashTrackingSecret(token),
    wrapped: "cifrado",
  })
  assert.deepEqual(Object.keys(dto).sort(), ["date", "partySize", "proposal", "referenceCode", "status", "time", "updatedAt", "zone"])
  const json = JSON.stringify(dto)
  assert.equal(json.includes("Ana"), false)
  assert.equal(json.includes("2887"), false)
  assert.equal(json.includes("cumpleaños"), false)
  assert.equal(json.includes("staff-admin"), false)
  assert.equal(json.includes("mesa-1"), false)
  assert.equal(json.includes(token), false)
  assert.equal(dto.proposal.zone, "terrace")

  const card = readFileSync(new URL("../src/components/features/reservations/reservation-status-card.tsx", import.meta.url), "utf8")
  assert.equal(card.includes("Aceptar cambio"), false)
  const form = readFileSync(new URL("../src/components/features/reservations/reservation-form.tsx", import.meta.url), "utf8")
  const success = readFileSync(new URL("../src/components/features/reservations/reservation-success.tsx", import.meta.url), "utf8")
  const actions = readFileSync(new URL("../src/components/features/reservations/reservation-tracking-actions.tsx", import.meta.url), "utf8")
  assert.ok(form.indexOf('data-reservation-enabled="off"') < form.indexOf("<ReservationSuccess"))
  assert.match(success, /<CopyTrackingLink/)
  assert.match(actions, /Copiar enlace/)
  assert.match(actions, /Ver estado de mi reserva/)
  assert.equal(actions.includes("<Input"), false)
  for (const file of [
    "src/server/reservations/tracking.ts",
    "src/server/reservations/status-request.ts",
    "src/app/api/reservations/status/route.ts",
    "src/components/features/reservations/reservation-status.tsx",
  ]) {
    assert.doesNotMatch(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), /console\.(log|info|debug|warn|error)/)
  }
})

test("el barrido de avisos solo acepta el secreto completo", async () => {
  const { authorizeNoticeCron } = await import("@/lib/reservations/notice-cron")
  const secret = "cron-secreto-de-prueba"
  assert.equal(authorizeNoticeCron(`Bearer ${secret}`, secret), true)
  assert.equal(authorizeNoticeCron(`Bearer ${secret}x`, secret), false)
  assert.equal(authorizeNoticeCron("Bearer corto", secret), false)
  assert.equal(authorizeNoticeCron(null, secret), false)
  assert.equal(authorizeNoticeCron(`Bearer ${secret}`, ""), false)
  assert.equal(authorizeNoticeCron(`Bearer ${secret}`, "corto"), false)
})

test("guardar una sección no trae de vuelta el resto desde una copia vieja", () => {
  const stored = defaultOperationRules()
  stored.week = { ...stored.week, mon: { ...stored.week.mon, opensAt: "12:00" } }
  const stale = defaultOperationRules()
  stale.sectors = { ...stale.sectors, salon: { ...stale.sectors.salon, web: 3 } }
  const next = applyFloorSection(stored, stale, "zones")
  assert.equal(next.sectors.salon.web, 3)
  assert.equal(next.week.mon.opensAt, "12:00")
  assert.equal(next.serviceMinutes, stored.serviceMinutes)
})
