import test from "node:test"
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"

import { planAssignment, readCapacity } from "@/lib/reservations/capacity"
import { admitRequest, quotaReason } from "@/lib/reservations/day-policy"
import { applyFloorSection, criticalFingerprint, declaredTables, defaultOperationRules, informedGroups, operationsDocument, readinessIssues, readOperationRules } from "@/lib/reservations/operations"
import { pendingOwnerDecisions, reservationConfig } from "@/lib/reservations/configuration"
import { ReservationError } from "@/lib/reservations/errors"
import { readPublicBody } from "@/lib/reservations/public-request"
import { confirmedClock, defaultWeek, hoursLines, instantInSantiago, isClosedDay, openingWindow, preferenceSlots, previousIso, todayIsoInSantiago, weekdayOf } from "@/lib/reservations/schedule"
import { pageSchedule, pastWindow, staffView } from "@/lib/reservations/staff-views"
import { staffPartyException, validateTime, validateVisit } from "@/lib/reservations/validation"
import { eligibleServiceTables } from "@/lib/reservations/service-tables"
import { waiterMayReadNotice } from "@/lib/reservations/service-notices"
import { canTransition } from "@/lib/reservations/transitions"
import { clientAddress } from "@/lib/reservations/client-address"
import { createTrackingSecret, hashTrackingSecret, trackingExpired, trackingExpiresOn, unwrapTrackingSecret, wrapTrackingSecret } from "@/lib/reservations/tracking"
import { claimPublicReference, formatPublicReference } from "@/lib/reservations/reference"
import { parseTrackingCredential, publicReservationStatus } from "@/lib/reservations/tracking-link"
import { reservationStatusEnabled, reservationWritesEnabled } from "@/lib/reservations/writes"
import { requestIsTrusted } from "@/lib/auth/session-policy"
import { quotaTone, webQuotaRows } from "@/lib/reservations/web-quota"
import { normalizeReservationEmail, optionalReservationEmail, planReservationCreate, requestCountLabel } from "@/lib/reservations/email"

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
    customerEmail: "ana.soto@correo.cl",
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

test("cualquier día se reserva con al menos dos horas y a las 18:00 todavía se puede pedir las 20:00", () => {
  for (const date of ["2026-11-09", "2026-11-13"]) {
    const atSix = instantInSantiago(date, "18:00")
    const slots = preferenceSlots(date, atSix)
    assert.equal(slots.includes("20:00"), true)
    assert.equal(slots.includes("19:30"), false)
    readPublicBody(JSON.stringify(body({ date, preferredTime: "20:00" })), atSix)
    assert.throws(
      () => readPublicBody(JSON.stringify(body({ date, preferredTime: "19:30" })), atSix),
      (error) => error instanceof ReservationError && error.status === 422 && error.message.includes("2 horas"),
    )
  }
  assert.equal(reservationConfig.minimumLeadHours, 2)
})

test("el personal puede anotar una hora dentro de las dos horas y el cliente no", () => {
  const date = "2026-11-09"
  const atSix = instantInSantiago(date, "18:00")
  const draft = {
    date,
    partySize: 2,
    zone: "salon",
    preferredTime: "19:30",
    customerName: "Ana",
    customerPhone: "+56 9 2887 3619",
    customerEmail: "ana@example.test",
    marketingOptIn: false,
    notes: "",
  }
  assert.match(validateTime(draft, atSix).preferredTime ?? "", /2 horas/)
  assert.equal(validateTime(draft, atSix, { skipAnticipation: true }).preferredTime, undefined)
  assert.match(validateTime({ ...draft, preferredTime: "16:00" }, atSix, { skipAnticipation: true }).preferredTime ?? "", /no corresponde/)
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
  assert.equal(parsed.customerEmail, "ana.soto@correo.cl")
  assert.equal(parsed.marketingOptIn, false)
  assert.equal(readPublicBody(JSON.stringify(body({ marketingOptIn: true })), now).marketingOptIn, true)
  fails({ ...body(), marketingOptIn: "si" }, 400)
  const normalized = readPublicBody(JSON.stringify(body({ customerEmail: "  ANA.SOTO@Correo.CL " })), now)
  assert.equal(normalized.customerEmail, "ana.soto@correo.cl")
  fails({ ...body(), customerEmail: "ana" }, 422)
  fails({ ...body(), customerEmail: `${"a".repeat(121)}@correo.cl` }, 422)
  fails({ ...body(), customerEmail: "" }, 422)
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
  assert.equal(document.week.mon.lastSeatingTime, "21:00")
  assert.equal(document.week.fri.lastSeatingTime, "22:00")
  const lines = hoursLines(defaultWeek())
  assert.deepEqual(lines.map((line) => line.days), ["Lunes a jueves", "Viernes y sábado", "Domingo"])
  assert.equal(lines[0].hours, "17:00–22:00 hrs.")
  assert.equal(lines[0].lastSeatingTime, "21:00")
  assert.equal(lines[1].lastSeatingTime, "22:00")
  assert.equal(lines[2].hours, "Cerrado")
  const monday = preferenceSlots("2026-11-09", now, confirmedClock, null, defaultWeek(), 0)
  const friday = preferenceSlots("2026-11-13", now, confirmedClock, null, defaultWeek(), 0)
  assert.equal(monday.at(-1), "21:00")
  assert.equal(monday.includes("21:30"), false)
  assert.equal(friday.at(-1), "22:00")
  assert.equal(friday.includes("22:30"), false)
  const extended = preferenceSlots(
    "2026-11-09",
    now,
    confirmedClock,
    { closed: false, hours: { opensAt: "13:00", closesAt: "22:00" }, lastSeatingTime: null },
    defaultWeek(),
    0,
  )
  assert.equal(extended.at(-1), "21:00")
  assert.equal(extended.includes("21:30"), false)
  const cleared = defaultWeek()
  for (const day of Object.values(cleared)) day.lastSeatingTime = null
  const restored = readOperationRules({ ...document, week: cleared })
  assert.equal(restored?.week.mon.lastSeatingTime, "21:00")
  assert.equal(restored?.week.fri.lastSeatingTime, "22:00")
  const withoutCap = preferenceSlots("2026-11-09", now, restored.clock, null, restored.week, 0)
  assert.equal(withoutCap.includes("21:30"), false)
  assert.throws(
    () => readPublicBody(JSON.stringify(body({ preferredTime: "21:30" })), now, { clock: restored.clock, week: restored.week }),
    (error) => error instanceof ReservationError && error.status === 422,
  )
  readPublicBody(JSON.stringify(body({ preferredTime: "21:00" })), now, { clock: restored.clock, week: restored.week })
  const legacyWeek = defaultWeek()
  for (const day of Object.values(legacyWeek)) delete day.lastSeatingTime
  const legacy = readOperationRules({ ...document, week: legacyWeek })
  assert.equal(legacy?.week.thu.lastSeatingTime, "21:00")
  assert.equal(legacy?.week.sat.lastSeatingTime, "22:00")
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

test("los cupos de personas respetan la duración y un grupo ocupa a sus personas", () => {
  const document = operationsDocument({
    ...defaultOperationRules(),
    sectors: {
      salon: { total: 19, web: 20 },
      terrace: { total: 15, web: 20 },
    },
  })
  const config = readCapacity(document, { allowFixture: false })
  assert.equal(config?.sectors?.salon, 20)
  const first = planAssignment({ config, bookings: {}, zone: "salon", partySize: 15, startMin: 17 * 60 })
  assert.equal(first.ok, true)
  assert.deepEqual(first.ok && first.tableIds, [])
  assert.equal(first.ok && first.slots, 15)
  assert.equal(first.ok && first.endMin, 18 * 60 + 30)
  const busy = {
    one: { tableIds: [], slots: 15, startMin: 17 * 60, endMin: 18 * 60 + 30, zone: "salon" },
  }
  assert.equal(planAssignment({ config, bookings: busy, zone: "salon", partySize: 6, startMin: 17 * 60 + 30 }).reason, "overlap")
  assert.equal(planAssignment({ config, bookings: busy, zone: "salon", partySize: 6, startMin: 19 * 60 }).ok, true)
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
  assert.equal(admitRequest({ ...rules, receptionPaused: true, receptionNotice: "venueClosed" }, null, monday).message, rules.notices.venueClosed.text)
  const fullDay = { date: monday, closed: false, full: true, hours: null, lastSeatingTime: null, daily: { mode: "inherit", max: null }, slot: { mode: "inherit", max: null }, notice: null, updatedBy: null, updatedAt: null }
  const full = admitRequest(rules, fullDay, monday)
  assert.equal(full.ok, false)
  assert.equal(full.code, "full")
  assert.match(full.message, /^Las reservas online para el .+ están completas/)
  const today = todayIsoInSantiago()
  const todayFull = admitRequest(rules, { ...fullDay, date: today }, today)
  assert.equal(todayFull.message, "Las reservas online para hoy están completas. ¡Pero puedes visitarnos igualmente! Atendemos por orden de llegada, según disponibilidad de mesas.")
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
  assert.equal(canTransition("rejected", "confirm"), true)
  assert.equal(canTransition("rejected", "reschedule"), true)
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
    customerEmail: "ana.soto@correo.cl",
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
  assert.equal(json.includes("ana.soto@correo.cl"), false)
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
  stale.maxParty = { salon: 20, terrace: 20 }
  const next = applyFloorSection(stored, stale, "zones")
  assert.equal(next.sectors.salon.web, 3)
  assert.equal(next.maxParty.salon, 20)
  assert.equal(next.maxParty.terrace, 20)
  assert.equal(next.week.mon.opensAt, "12:00")
  assert.equal(next.serviceMinutes, stored.serviceMinutes)
})

test("el tope de personas guardado frena al cliente y no al personal", () => {
  const draft = {
    date: "2026-11-09",
    partySize: 20,
    zone: "salon",
    preferredTime: "18:00",
    customerName: "Ana",
    customerPhone: "+56 9 2887 3619",
    customerEmail: "ana@example.test",
    marketingOptIn: false,
    notes: "",
  }
  const capped = validateVisit(draft, now, { maxParty: { salon: 15, terrace: 20 } })
  assert.match(capped.partySize ?? "", /hasta 15/)
  const opened = validateVisit(draft, now, { maxParty: { salon: 20, terrace: 20 } })
  assert.equal(opened.partySize, undefined)
  const staff = validateVisit({ ...draft, partySize: 30 }, now, { maxParty: { salon: 15, terrace: 20 }, skipPartyLimit: true })
  assert.equal(staff.partySize, undefined)
  assert.match(staffPartyException("salon", 20, { salon: 15, terrace: 20 }), /Excepción de administración/)
  assert.equal(staffPartyException("terrace", 20, { salon: 15, terrace: 20 }), "")
})

test("hoy, futuras y pasadas usan el día de Chile, el mes y un desempate estable", () => {
  const beforeMidnight = new Date("2026-04-01T02:30:00Z")
  const afterMidnight = new Date("2026-04-01T05:30:00Z")
  const before = todayIsoInSantiago(beforeMidnight)
  const after = todayIsoInSantiago(afterMidnight)
  assert.notEqual(before, after)
  assert.equal(after > before, true)
  const opened = pastWindow(undefined, after)
  if (after.endsWith("-01")) assert.equal(opened.empty, true)
  else assert.equal(opened.to, previousIso(after))
  assert.equal(pastWindow(undefined, before).to < before, true)

  const leap = pastWindow("2024-02", "2024-03-01")
  assert.equal(leap.from, "2024-02-01")
  assert.equal(leap.to, "2024-02-29")
  assert.equal(leap.nextMonth, "2024-03")
  assert.equal(pastWindow("2025-02", "2025-03-01").to, "2025-02-28")
  assert.equal(pastWindow(undefined, "2026-03-31").to, "2026-03-30")

  const december = pastWindow("2025-12", "2026-01-15")
  assert.equal(december.from, "2025-12-01")
  assert.equal(december.to, "2025-12-31")
  assert.equal(december.previousMonth, "2025-11")
  assert.equal(december.nextMonth, "2026-01")
  assert.equal(pastWindow("2026-08", "2026-01-15").month, "2026-01")
  assert.equal(pastWindow("2026-01", "2026-01-15").to, "2026-01-14")
  assert.equal(pastWindow("2026-01", "2026-01-15").nextMonth, null)
  assert.equal(staffView(undefined), "today")
  assert.equal(staffView("desconocida"), "today")
  assert.equal(staffView("today"), "today")
  assert.equal(staffView("future"), "future")
  assert.equal(staffView("past"), "past")

  const repeated = Array.from({ length: 25 }, (_, index) => ({
    id: `doc-${String(index).padStart(2, "0")}`,
    date: "2026-11-18",
    preferredTime: "20:30",
  }))
  const first = pageSchedule(repeated, "asc", undefined, 20)
  const second = pageSchedule(repeated, "asc", first.nextCursor ?? undefined, 20)
  assert.equal(first.items.length, 20)
  assert.equal(second.items.length, 5)
  assert.equal(second.nextCursor, null)
  assert.equal(first.items[0].id, "doc-00")
  assert.equal(second.items[0].id, "doc-20")
  assert.equal(new Set([...first.items, ...second.items].map((row) => row.id)).size, 25)
  assert.equal(pageSchedule(repeated, "desc", undefined, 20).items[0].id, "doc-24")

  const mixed = [
    { id: "b", date: "2026-11-19", preferredTime: "13:00" },
    { id: "a", date: "2026-11-18", preferredTime: "21:00" },
    { id: "c", date: "2026-11-18", preferredTime: "21:00" },
    { id: "d", date: "2026-11-18", preferredTime: "19:00" },
  ]
  assert.deepEqual(pageSchedule(mixed, "asc", undefined, 20).items.map((row) => row.id), ["d", "a", "c", "b"])
  assert.deepEqual(pageSchedule(mixed, "desc", undefined, 20).items.map((row) => row.id), ["b", "c", "a", "d"])

  const service = readFileSync(new URL("../src/server/reservations/service.ts", import.meta.url), "utf8")
  assert.match(service, /orderBy\("preferredTime", "asc"\)/)
  assert.match(service, /orderBy\("preferredTime", direction\)/)
  assert.match(service, /FieldPath\.documentId\(\)/)
  assert.match(service, /where\("date", ">", today\)/)
  assert.match(service, /where\("date", ">=", window\.from\)\.where\("date", "<=", window\.to\)/)
  assert.match(service, /countOf\(base\.where\("status", "==", "pending"\)\)/)
  assert.match(service, /where\("status", "==", "pending"\)\.orderBy\("createdAt", "desc"\)/)
  const indexes = readFileSync(new URL("../firestore.indexes.json", import.meta.url), "utf8")
  assert.match(indexes, /"fieldPath": "preferredTime", "order": "ASCENDING"/)
  assert.match(indexes, /"fieldPath": "preferredTime", "order": "DESCENDING"/)
  assert.match(indexes, /"fieldPath": "__name__", "order": "ASCENDING"/)
  assert.match(indexes, /"fieldPath": "__name__", "order": "DESCENDING"/)
  const scope = readFileSync(new URL("../src/components/features/admin/reservations/reservation-scope.tsx", import.meta.url), "utf8")
  assert.doesNotMatch(scope, /cursor/)
  const reservationsPage = readFileSync(new URL("../src/app/admin/(panel)/reservas/page.tsx", import.meta.url), "utf8")
  assert.match(reservationsPage, /\/admin\/reservas\/historial/)
  assert.match(reservationsPage, /status: "confirmed", date: today/)
})

test("el correo se normaliza y el contador solo se pide al abrir la ficha", () => {
  assert.equal(normalizeReservationEmail("  Ana@Correo.CL ").email, "ana@correo.cl")
  assert.equal("error" in normalizeReservationEmail("ana"), true)
  assert.equal("error" in normalizeReservationEmail(`${"a".repeat(121)}@correo.cl`), true)
  assert.equal(optionalReservationEmail("  ").email, null)
  assert.equal(planReservationCreate(true, true), "duplicate")
  assert.equal(planReservationCreate(true, false), "conflict")
  assert.equal(planReservationCreate(false, true), "create")
  assert.equal(requestCountLabel(1), "1 solicitud realizada")
  assert.equal(requestCountLabel(2), "2 solicitudes realizadas")

  const service = readFileSync(new URL("../src/server/reservations/service.ts", import.meta.url), "utf8")
  assert.doesNotMatch(service, /reservationGuests|PIU_RESERVATION_GUEST_SECRET|guestDocumentId/)
  const detail = service.slice(service.indexOf("async function getReservationForStaff"), service.indexOf("type TransitionInput"))
  assert.match(detail, /where\("customerEmail", "==", item\.customerEmail\)/)
  assert.match(detail, /countOf\(/)
  assert.match(service, /query\.count\(\)\.get\(\)/)
  const listing = service.slice(service.indexOf("async function listReservationsForStaff"), service.indexOf("async function getReservationForStaff"))
  assert.doesNotMatch(listing, /customerEmail/)
  assert.equal(existsSync(new URL("../src/server/reservations/guest.ts", import.meta.url)), false)
  assert.equal(existsSync(new URL("../src/lib/reservations/guest-id.ts", import.meta.url)), false)
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8")
  assert.match(rules, /match \/reservationGuests\/\{guestId\} \{\s*allow read, write: if false;/s)
  const hosting = readFileSync(new URL("../apphosting.yaml", import.meta.url), "utf8")
  assert.doesNotMatch(hosting, /PIU_RESERVATION_GUEST_SECRET/)
  const example = readFileSync(new URL("../.env.example", import.meta.url), "utf8")
  assert.doesNotMatch(example, /PIU_RESERVATION_GUEST_SECRET/)
  const contact = readFileSync(new URL("../src/components/features/reservations/reservation-contact-step.tsx", import.meta.url), "utf8")
  assert.match(contact, /type="email"/)
  assert.match(contact, /inputMode="email"/)
  assert.match(contact, /autoComplete="email"/)
  const patch = readFileSync(new URL("../src/app/api/admin/reservations/[id]/route.ts", import.meta.url), "utf8")
  assert.doesNotMatch(patch, /customerEmail/)
  const manual = readFileSync(new URL("../src/components/features/admin/reservations/manual-reservation-form.tsx", import.meta.url), "utf8")
  assert.match(manual, /name="customerEmail"/)
  assert.doesNotMatch(manual, /name="customerEmail"[^>]*required/)
})

test("la casilla de promociones nace marcada y la aceptación queda en la reserva", () => {
  assert.equal(readPublicBody(JSON.stringify(body({ marketingOptIn: false })), now).marketingOptIn, false)
  const form = readFileSync(new URL("../src/components/features/reservations/reservation-form.tsx", import.meta.url), "utf8")
  assert.match(form, /marketingOptIn: true/)
  assert.match(form, /Acepto recibir información, novedades y promociones de PIÙ Pizza & Dolce por correo electrónico/)
  assert.match(form, /Si no la quieres, desmárcala/)
  const service = readFileSync(new URL("../src/server/reservations/service.ts", import.meta.url), "utf8")
  assert.match(service, /marketingConsent: true/)
  assert.match(service, /marketingConsentAt: stamp/)
  assert.match(service, /marketingConsentSource: "web_reservation"/)
  assert.match(service, /marketingConsentVersion: "v1"/)
  assert.match(service, /input\.marketingOptIn/)
  assert.doesNotMatch(service, /marketingSubscribers|marketingTokens|confirmToken|createMarketingToken/)
  assert.doesNotMatch(service, /reservationGuests/)
  const manual = readFileSync(new URL("../src/components/features/admin/reservations/manual-reservation-form.tsx", import.meta.url), "utf8")
  assert.doesNotMatch(manual, /marketingOptIn|marketingConsent/)
  const adminRoute = readFileSync(new URL("../src/app/api/admin/reservations/route.ts", import.meta.url), "utf8")
  assert.doesNotMatch(adminRoute, /marketingOptIn|marketingConsent/)
  const publicRoute = readFileSync(new URL("../src/app/api/reservations/route.ts", import.meta.url), "utf8")
  assert.doesNotMatch(publicRoute, /confirmToken|marketingConfirmation|customerEmail/)
  const status = readFileSync(new URL("../src/lib/reservations/tracking-link.ts", import.meta.url), "utf8")
  assert.doesNotMatch(status, /customerEmail|marketingConsent/)
  assert.equal(existsSync(new URL("../src/app/reservas/promociones/page.tsx", import.meta.url)), false)
  assert.equal(existsSync(new URL("../src/app/api/reservations/marketing/route.ts", import.meta.url)), false)
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8")
  assert.match(rules, /match \/marketingSubscribers\/\{subscriberId\}/)
  assert.match(rules, /match \/marketingTokens\/\{tokenId\}/)
})

test("el mesero solo ve mesas libres y avisos de atención", () => {
  const tables = [
    { id: "t1", label: "Mesa 1", zone: "salon", seats: 4, blocked: false, reservable: true },
    { id: "t2", label: "Mesa 2", zone: "salon", seats: 2, blocked: false, reservable: true },
    { id: "t3", label: "Mesa 3", zone: "terrace", seats: 4, blocked: false, reservable: true },
    { id: "t4", label: "Mesa 4", zone: "salon", seats: 4, blocked: true, reservable: true },
  ]
  const bookings = { otra: { tableLabel: "Mesa 1", tableIds: ["t1"], startMin: 18 * 60, endMin: 19 * 60 + 30 } }
  const free = eligibleServiceTables({ tables, zone: "salon", partySize: 4, startMin: 18 * 60, endMin: 19 * 60 + 30, bookings, reservationId: "propia" })
  assert.deepEqual(free.map((table) => table.label), [])
  const later = eligibleServiceTables({ tables, zone: "salon", partySize: 4, startMin: 21 * 60, endMin: 22 * 60, bookings, reservationId: "propia" })
  assert.deepEqual(later.map((table) => table.id), ["t1"])
  assert.equal(waiterMayReadNotice({ type: "created", title: "Nueva reserva" }), false)
  assert.equal(waiterMayReadNotice({ type: "attention", title: "Sigue pendiente" }), false)
  assert.equal(waiterMayReadNotice({ type: "changed", title: "Solicitud rechazada" }), false)
  assert.equal(waiterMayReadNotice({ type: "confirmed", title: "Reserva confirmada" }), true)
  assert.equal(waiterMayReadNotice({ type: "changed", title: "Mesa actualizada" }), true)
  const service = readFileSync(new URL("../src/server/reservations/service.ts", import.meta.url), "utf8")
  assert.match(service, /Esa acción no está disponible para el mesero/)
  assert.match(service, /preferenceSlots\(input\.date/)
  const desk = readFileSync(new URL("../src/server/reservations/service-desk.ts", import.meta.url), "utf8")
  assert.doesNotMatch(desk, /customerEmail|marketingConsent|customerPhone/)
})

test("la disponibilidad separa las 17:30 y pinta menos de 5 cupos", () => {
  const rows = webQuotaRows({
    date: "2026-11-09",
    week: defaultOperationRules().week,
    serviceMinutes: 90,
    web: { salon: 15, terrace: 15 },
    bookings: [{ id: "a", zone: "salon", tableIds: [], slots: 1, startMin: 17 * 60 + 30, endMin: 19 * 60 }],
    visits: [
      { zone: "salon", time: "17:30", partySize: 6 },
      { zone: "salon", time: "17:00", partySize: 2 },
    ],
    visit: { closed: false, hours: { opensAt: "17:00", closesAt: "19:00" }, lastSeatingTime: null },
  })
  assert.ok(rows)
  assert.deepEqual(rows.map((row) => row.time), ["17:00", "17:30", "18:00", "18:30"])
  const five = rows.find((row) => row.time === "17:00")
  const half = rows.find((row) => row.time === "17:30")
  assert.equal(five.people.salon, 2)
  assert.equal(five.salon.used, 1)
  assert.equal(half.people.salon, 6)
  assert.equal(half.salon.used, 1)
  assert.equal(quotaTone({ used: 10, web: 15 }), "free")
  assert.equal(quotaTone({ used: 11, web: 15 }), "partial")
  assert.equal(quotaTone({ used: 15, web: 15 }), "none")
})
