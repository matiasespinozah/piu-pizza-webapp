import test from "node:test"
import assert from "node:assert/strict"

import { StaffAccessError } from "@/server/auth/authorization"
import { getDb } from "@/server/firebase/firestore"
import { readPublicBody } from "@/lib/reservations/public-request"
import {
  createPublicReservation,
  createStaffReservation,
  getReservationForStaff,
  listReservationsForStaff,
  rateLimitPerHour,
  transitionReservation,
} from "@/server/reservations/service"
import { listStaffNotices, markStaffNoticesRead, sweepNotices } from "@/server/reservations/notifications"
import { santiagoParts, todayIsoInSantiago, weekdayOf } from "@/lib/reservations/schedule"

assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "Estas pruebas solo corren dentro del emulador.")
assert.equal(process.env.GCLOUD_PROJECT, "demo-piu-pizza")
assert.notEqual(process.env.GCLOUD_PROJECT, "piu-pizza-cl")

const admin = { uid: "staff-admin", role: "admin", email: "ana@example.test", displayName: "Ana" }
const owner = { uid: "staff-owner", role: "superadmin", email: "felipe@example.test", displayName: "Felipe" }
const now = new Date("2026-11-07T18:00:00Z")

function futureWeekday(target) {
  const today = todayIsoInSantiago(now)
  const [year, month, day] = today.split("-").map(Number)
  for (let offset = 1; offset <= 21; offset += 1) {
    const iso = new Date(Date.UTC(year, month - 1, day + offset)).toISOString().slice(0, 10)
    if (weekdayOf(iso) === target) return iso
  }
  throw new Error("No hay una fecha de prueba.")
}

const monday = futureWeekday("mon")

function payload(overrides = {}) {
  return {
    idempotencyKey: crypto.randomUUID(),
    date: monday,
    preferredTime: "18:00",
    partySize: 2,
    preferredZone: "salon",
    customerName: "Ana Soto",
    customerPhone: "+56 9 2887 3619",
    notes: "Sin cebolla",
    ...overrides,
  }
}

async function send(raw, ip = "203.0.113.10") {
  const input = readPublicBody(JSON.stringify(raw), now)
  return { ...(await createPublicReservation(input, ip, now)), id: raw.idempotencyKey }
}

function tables(next = defaultTables) {
  return {
    timeZone: "America/Santiago",
    capacityReady: true,
    fixture: true,
    serviceMinutes: 90,
    tables: next,
  }
}

const defaultTables = [
  { id: "fixture-salon-1", zone: "salon", seats: 4, blocked: false },
  { id: "fixture-salon-blocked", zone: "salon", seats: 4, blocked: true },
  { id: "fixture-terrace-1", zone: "terrace", seats: 2, blocked: false },
]

async function seed(next = defaultTables) {
  await getDb().collection("restaurantSettings").doc("operations").set(tables(next))
}

async function wipe() {
  const db = getDb()
  await db.recursiveDelete(db.collection("reservations"))
  await db.recursiveDelete(db.collection("reservationHolds"))
  await db.recursiveDelete(db.collection("reservationRate"))
  await db.recursiveDelete(db.collection("reservationAccess"))
  await db.recursiveDelete(db.collection("reservationStatusRate"))
  await db.recursiveDelete(db.collection("reservationDays"))
  await db.recursiveDelete(db.collection("staffNotifications"))
  await db.recursiveDelete(db.collection("auditLogs"))
}

test.before(async () => {
  await seed()
})

test.beforeEach(async () => {
  await wipe()
  await seed()
})

test("una solicitud válida queda pendiente y el teléfono no sale en la respuesta", async () => {
  const result = await send(payload())
  assert.equal(result.receipt.status, "pending")
  assert.match(result.receipt.referenceCode, /^PIU-\d{4}$/)
  assert.equal(JSON.stringify(result.receipt).includes("2887"), false)
  assert.equal(typeof result.trackingToken, "string")
  const stored = await getDb().collection("reservations").doc(result.id).get()
  assert.equal(JSON.stringify(stored.data()).includes(result.trackingToken), false)
  assert.equal(stored.data()?.status, "pending")
  assert.deepEqual(stored.data()?.assignedTableIds, [])
})

test("el mismo envío no crea dos documentos y otro envío sí es otra solicitud", async () => {
  const first = payload()
  const again = await send(first)
  const replay = await send(first)
  assert.equal(replay.duplicate, true)
  assert.equal(replay.receipt.referenceCode, again.receipt.referenceCode)
  assert.equal(replay.trackingToken, again.trackingToken)
  const access = await getDb().collection("reservationAccess").get()
  assert.equal(access.size, 1)
  const other = await send(payload({ customerName: "Ana Soto" }))
  assert.notEqual(other.id, first.idempotencyKey)
  const all = await getDb().collection("reservations").get()
  assert.equal(all.size, 2)
})

test("la misma clave con otros datos no pisa la solicitud", async () => {
  const first = payload()
  await send(first)
  await assert.rejects(() => send({ ...first, customerName: "Otra Persona" }), (error) => error.status === 409)
  const all = await getDb().collection("reservations").get()
  assert.equal(all.size, 1)
})

test("sin el permiso de escritura no se guarda nada", async () => {
  const previous = process.env.PIU_RESERVATIONS_WRITES
  process.env.PIU_RESERVATIONS_WRITES = "off"
  try {
    await assert.rejects(() => send(payload(), "203.0.113.20"), (error) => error.status === 503)
  } finally {
    process.env.PIU_RESERVATIONS_WRITES = previous
  }
  assert.equal((await getDb().collection("reservations").get()).size, 0)
})

test("un visitante y una sesión vacía no leen el listado", async () => {
  await assert.rejects(() => listReservationsForStaff(null, {}), StaffAccessError)
})

test("admin y superadmin ven la solicitud sin el teléfono en el listado", async () => {
  const created = await send(payload())
  const asAdmin = await listReservationsForStaff(admin, { view: "pending" })
  const asOwner = await listReservationsForStaff(owner, { q: created.receipt.referenceCode })
  assert.equal(asAdmin.items.length, 1)
  assert.equal(JSON.stringify(asAdmin.items).includes("2887"), false)
  assert.equal(asOwner.items[0]?.referenceCode, created.receipt.referenceCode)
  const detail = await getReservationForStaff(admin, created.id)
  assert.match(detail.customerPhone, /2887/)
  assert.equal(detail.events.some((event) => event.action === "received"), true)
})

test("confirmar, rechazar y cancelar respetan la transición y la revisión", async () => {
  const created = await send(payload())
  await transitionReservation(admin, { id: created.id, action: "reject", revision: 1, reason: "Sin cupo" }, now)
  const rejected = await listReservationsForStaff(admin, { status: "rejected" })
  const noneCancelled = await listReservationsForStaff(admin, { status: "cancelled" })
  assert.equal(rejected.items.length, 1)
  assert.equal(noneCancelled.items.length, 0)
  assert.equal(JSON.stringify(rejected.items).includes("2887"), false)
  await assert.rejects(
    () => transitionReservation(owner, { id: created.id, action: "confirm", revision: 2 }, now),
    (error) => error.status === 409
  )

  const second = await send(payload())
  await transitionReservation(owner, { id: second.id, action: "confirm", revision: 1 }, now)
  await assert.rejects(
    () => transitionReservation(admin, { id: second.id, action: "cancel", revision: 1 }, now),
    (error) => error.code === "conflict"
  )
  const detail = await getReservationForStaff(owner, second.id)
  assert.equal(detail.status, "confirmed")
  assert.equal(detail.events.some((event) => event.actorUid === owner.uid && event.action === "confirm"), true)
})

test("dos confirmaciones no ocupan la misma mesa", async () => {
  const first = await send(payload())
  const second = await send(payload({ customerName: "Luis Mora", customerPhone: "+56 9 8765 4321" }))
  const results = await Promise.allSettled([
    transitionReservation(admin, { id: first.id, action: "confirm", revision: 1 }, now),
    transitionReservation(owner, { id: second.id, action: "confirm", revision: 1 }, now),
  ])
  assert.equal(results.filter((item) => item.status === "fulfilled").length, 1)
  const hold = await getDb().collection("reservationHolds").doc(`${monday}_salon`).get()
  assert.equal(Object.keys(hold.data()?.bookings ?? {}).length, 1)
})

test("un horario cruzado, una mesa bloqueada y un grupo grande no se confirman; sin mesas el sector sí", async () => {
  const early = await send(payload({ preferredTime: "17:00" }))
  await transitionReservation(admin, { id: early.id, action: "confirm", revision: 1 }, now)
  const crossed = await send(payload({ preferredTime: "18:00", customerName: "Cruz Ada" }))
  await assert.rejects(
    () => transitionReservation(admin, { id: crossed.id, action: "confirm", revision: 1 }, now),
    (error) => error.code === "capacity_overlap"
  )
  const earlyAfter = await getDb().collection("reservations").doc(early.id).get()
  const crossedAfter = await getDb().collection("reservations").doc(crossed.id).get()
  assert.equal(earlyAfter.data()?.status, "confirmed")
  assert.equal(earlyAfter.data()?.revision, 2)
  assert.equal(crossedAfter.data()?.status, "pending")
  assert.equal(crossedAfter.data()?.revision, 1)
  const holdAfter = await getDb().collection("reservationHolds").doc(`${monday}_salon`).get()
  assert.ok(holdAfter.data()?.bookings?.[early.id])
  assert.equal(holdAfter.data()?.bookings?.[crossed.id], undefined)
  const later = await send(payload({ preferredTime: "18:30", customerName: "Tarde Ada", customerPhone: "+56 9 1111 2222" }))
  await transitionReservation(admin, { id: later.id, action: "confirm", revision: 1 }, now)

  await seed([{ id: "fixture-salon-blocked", zone: "salon", seats: 4, blocked: true }])
  const blocked = await send(payload({ customerName: "Mesa Bloqueada", customerPhone: "+56 9 2222 3333" }))
  await assert.rejects(
    () => transitionReservation(admin, { id: blocked.id, action: "confirm", revision: 1 }, now),
    (error) => error.code === "capacity_blocked"
  )

  await seed([{ id: "fixture-salon-1", zone: "salon", seats: 4, blocked: false }])
  const outside = await send(payload({ preferredZone: "terrace", customerName: "Terraza Ada", customerPhone: "+56 9 3333 4444" }))
  await transitionReservation(admin, { id: outside.id, action: "confirm", revision: 1 }, now)
  const outsideStored = (await getDb().collection("reservations").doc(outside.id).get()).data()
  assert.equal(outsideStored?.status, "confirmed")
  assert.deepEqual(outsideStored?.assignedTableIds, [])
  assert.equal(outsideStored?.holdZone, "terrace")
  assert.equal(outsideStored?.exception, undefined)

  await seed()
  const big = await send(payload({ partySize: 10, customerName: "Grupo Grande", customerPhone: "+56 9 4444 5555" }))
  await assert.rejects(
    () => transitionReservation(admin, { id: big.id, action: "confirm", revision: 1 }, now),
    (error) => error.code === "capacity_insufficient"
  )
})

test("cancelar libera la mesa y proponer un cambio no la suelta antes de tiempo", async () => {
  const first = await send(payload())
  await transitionReservation(admin, { id: first.id, action: "confirm", revision: 1 }, now)
  await transitionReservation(admin, { id: first.id, action: "cancel", revision: 2 }, now)
  const second = await send(payload({ customerName: "Después Ada", customerPhone: "+56 9 5555 6666" }))
  await transitionReservation(owner, { id: second.id, action: "confirm", revision: 1 }, now)

  await transitionReservation(
    admin,
    {
      id: second.id,
      action: "propose",
      revision: 2,
      proposedDate: monday,
      proposedTime: "20:00",
      proposedZone: "salon",
    },
    now
  )
  const during = await getDb().collection("reservationHolds").doc(`${monday}_salon`).get()
  assert.ok(during.data()?.bookings?.[second.id])
  const detail = await getReservationForStaff(admin, second.id)
  assert.equal(detail.status, "reschedule_requested")
  assert.deepEqual(detail.assignedTableIds, ["fixture-salon-1"])

  await transitionReservation(owner, { id: second.id, action: "confirm", revision: 3 }, now)
  const moved = await getDb().collection("reservationHolds").doc(`${monday}_salon`).get()
  assert.equal(moved.data()?.bookings?.[second.id]?.startMin, 20 * 60)
})

test("sin la configuración real la confirmación no marca la solicitud como confirmada", async () => {
  await getDb().collection("restaurantSettings").doc("operations").delete()
  const created = await send(payload())
  await assert.rejects(
    () => transitionReservation(admin, { id: created.id, action: "confirm", revision: 1 }, now),
    (error) => error.code === "capacity_unconfigured"
  )
  const stored = await getDb().collection("reservations").doc(created.id).get()
  assert.equal(stored.data()?.status, "pending")
})

test("una pausa y un día cerrado impiden solicitudes nuevas y conservan las existentes", async () => {
  const created = await send(payload())
  await getDb().collection("restaurantSettings").doc("operations").set({ receptionPaused: true }, { merge: true })
  await assert.rejects(
    () => send(payload({ customerName: "Pausa Ada", customerPhone: "+56 9 6666 7777" }), "203.0.113.61"),
    (error) => error.code === "paused",
  )
  assert.equal((await getDb().collection("reservations").doc(created.id).get()).data()?.status, "pending")

  await seed()
  await getDb().collection("reservationDays").doc(monday).set({
    closed: true,
    full: false,
    hours: null,
    lastSeatingTime: null,
    daily: { mode: "inherit", max: null },
    slot: { mode: "inherit", max: null },
    notice: null,
  })
  await assert.rejects(
    () => send(payload({ customerName: "Cierre Ada", customerPhone: "+56 9 6666 8888" }), "203.0.113.62"),
    (error) => error.code === "closed",
  )
  assert.equal((await getDb().collection("reservations").get()).size, 1)
})

test("el tope diario deja la segunda confirmación pendiente", async () => {
  await seed([
    { id: "fixture-salon-1", zone: "salon", seats: 4, blocked: false },
    { id: "fixture-salon-2", zone: "salon", seats: 4, blocked: false },
  ])
  await getDb().collection("restaurantSettings").doc("operations").set(
    { dailyLimit: { mode: "capped", max: 1 }, slotLimit: { mode: "none", max: null } },
    { merge: true },
  )
  const first = await send(payload({ preferredTime: "17:00" }))
  const second = await send(payload({ preferredTime: "19:30", customerName: "Tope Ada", customerPhone: "+56 9 7777 8888" }))
  const results = await Promise.allSettled([
    transitionReservation(admin, { id: first.id, action: "confirm", revision: 1 }, now),
    transitionReservation(owner, { id: second.id, action: "confirm", revision: 1 }, now),
  ])
  assert.equal(results.filter((item) => item.status === "fulfilled").length, 1)
  const rejected = results.find((item) => item.status === "rejected")
  assert.equal(rejected?.reason?.code, "capacity_daily")
  const pending = await getDb().collection("reservations").doc(second.id).get()
  const confirmed = await getDb().collection("reservations").doc(first.id).get()
  const hold = await getDb().collection("reservationHolds").doc(`${monday}_salon`).get()
  const confirmedCount = [pending.data()?.status, confirmed.data()?.status].filter((status) => status === "confirmed").length
  assert.equal(confirmedCount, 1)
  assert.equal(Object.keys(hold.data()?.bookings ?? {}).length, 1)
})

test("el límite por hora corta la ráfaga y no guarda la dirección", async () => {
  const ip = "203.0.113.77"
  for (let index = 0; index < rateLimitPerHour; index += 1) {
    await send(payload({ customerName: `Persona ${index}`, customerPhone: `+56 9 7000 000${index}` }), ip)
  }
  await assert.rejects(() => send(payload({ customerName: "Una más", customerPhone: "+56 9 7000 0099" }), ip), (error) => error.status === 429)
  await send(payload({ customerName: "Otra red", customerPhone: "+56 9 7000 0088" }), "203.0.113.88")
  const rates = await getDb().collection("reservationRate").get()
  assert.equal(rates.size, 2)
  assert.equal(JSON.stringify(rates.docs.map((item) => item.data())).includes(ip), false)
  assert.equal(JSON.stringify(rates.docs.map((item) => item.data())).includes("203.0.113.88"), false)
})

test("sin mesas individuales la reserva queda en el sector y los cupos no cambian", async () => {
  await getDb().collection("restaurantSettings").doc("operations").set({
    capacityReady: true,
    fixture: false,
    serviceMinutes: 90,
    sectors: { salon: { web: 4 }, terrace: { web: 2 } },
    tables: [],
  })
  const created = await send(payload({ customerName: "Sector Ada", customerPhone: "+56 9 9090 1212" }))
  await transitionReservation(admin, { id: created.id, action: "confirm", revision: 1 }, now)
  const stored = (await getDb().collection("reservations").doc(created.id).get()).data()
  assert.equal(stored?.status, "confirmed")
  assert.deepEqual(stored?.assignedTableIds, [])
  assert.equal(stored?.exception, undefined)
  const hold = (await getDb().collection("reservationHolds").doc(`${monday}_salon`).get()).data()
  assert.deepEqual(hold?.bookings?.[created.id]?.tableIds, [])
  assert.equal(hold?.bookings?.[created.id]?.slots, 1)
  const settings = (await getDb().collection("restaurantSettings").doc("operations").get()).data()
  assert.equal(settings?.sectors?.salon?.web, 4)
  assert.deepEqual(settings?.tables, [])
})

test("una zona bloqueada o sin configuración se confirma solo con excepción auditada", async () => {
  await seed([{ id: "fixture-salon-blocked", zone: "salon", seats: 4, blocked: true }])
  const blocked = await send(payload({ customerName: "Bloqueo Ada", customerPhone: "+56 9 9191 2323" }))
  await transitionReservation(admin, {
    id: blocked.id,
    action: "confirm",
    revision: 1,
    exceptionConfirmed: true,
    reason: "Abrimos igual esa mesa",
  }, now)
  const blockedStored = (await getDb().collection("reservations").doc(blocked.id).get()).data()
  assert.equal(blockedStored?.status, "confirmed")
  assert.deepEqual(blockedStored?.assignedTableIds, [])
  assert.equal(blockedStored?.exception?.by, admin.uid)
  const stillBlocked = (await getDb().collection("restaurantSettings").doc("operations").get()).data()
  assert.equal(stillBlocked?.tables?.[0]?.blocked, true)

  await getDb().collection("restaurantSettings").doc("operations").delete()
  const missing = await send(payload({ customerName: "Sin Mesas", customerPhone: "+56 9 9292 3434" }))
  await assert.rejects(
    () => transitionReservation(owner, { id: missing.id, action: "confirm", revision: 1 }, now),
    (error) => error.code === "capacity_unconfigured",
  )
  await transitionReservation(owner, {
    id: missing.id,
    action: "confirm",
    revision: 1,
    exceptionConfirmed: true,
    reason: "La anotamos en el salón",
  }, now)
  const missingStored = (await getDb().collection("reservations").doc(missing.id).get()).data()
  assert.equal(missingStored?.status, "confirmed")
  assert.equal(missingStored?.holdZone, "salon")
  assert.deepEqual(missingStored?.assignedTableIds, [])
  assert.equal((await getDb().collection("restaurantSettings").doc("operations").get()).exists, false)
  const audit = await getDb().collection("auditLogs").where("targetPath", "==", `reservations/${missing.id}`).limit(5).get()
  assert.equal(audit.size, 1)
  assert.equal(audit.docs[0].data().action, "reservation.exception")
  assert.equal(audit.docs[0].data().actorUid, owner.uid)
  assert.equal(JSON.stringify(audit.docs[0].data()).includes("9292"), false)
})

test("el barrido guarda el aviso próximo aunque nadie abra el panel", async () => {
  const parts = santiagoParts(now)
  const soonMin = parts.minutes + 20
  const soon = `${String(Math.floor(soonMin / 60)).padStart(2, "0")}:${String(soonMin % 60).padStart(2, "0")}`
  await createStaffReservation(admin, {
    customerName: "Cron Ada",
    customerPhone: "+56 9 9393 4545",
    date: todayIsoInSantiago(now),
    preferredTime: soon,
    partySize: 2,
    preferredZone: "salon",
    confirm: true,
    exceptionConfirmed: true,
    exceptionReason: "Entra antes del horario de la web",
  }, now)
  await sweepNotices(now)
  await sweepNotices(now)
  const docs = await getDb().collection("staffNotifications").where("type", "==", "upcoming").limit(5).get()
  assert.equal(docs.size, 1)
  assert.match(docs.docs[0].data().body, /comienza en 20 minutos/)
})

test("el personal confirma un grupo más grande que la mesa y deja constancia", async () => {
  const before = (await getDb().collection("restaurantSettings").doc("operations").get()).data()
  const big = await send(payload({ partySize: 10, customerName: "Grupo Grande", customerPhone: "+56 9 4444 5555" }))
  await assert.rejects(
    () => transitionReservation(admin, { id: big.id, action: "confirm", revision: 1, exceptionConfirmed: true, reason: "corto" }, now),
    (error) => error.code === "capacity_insufficient",
  )
  await transitionReservation(admin, { id: big.id, action: "confirm", revision: 1, exceptionConfirmed: true, reason: "Juntamos dos mesas" }, now)
  const stored = (await getDb().collection("reservations").doc(big.id).get()).data()
  assert.equal(stored?.status, "confirmed")
  assert.deepEqual(stored?.assignedTableIds, [])
  assert.equal(stored?.exception?.by, admin.uid)
  assert.equal(stored?.exception?.reason, "Juntamos dos mesas")
  const hold = (await getDb().collection("reservationHolds").doc(`${monday}_salon`).get()).data()
  assert.deepEqual(hold?.bookings?.[big.id]?.tableIds, [])
  assert.equal(hold?.bookings?.[big.id]?.slots, 1)
  const after = (await getDb().collection("restaurantSettings").doc("operations").get()).data()
  assert.deepEqual(after?.tables, before?.tables)
  assert.equal(after?.dailyLimit, before?.dailyLimit)
})

test("una reserva cruzada se confirma solo con autorización explícita", async () => {
  const first = await send(payload({ preferredTime: "17:00" }))
  await transitionReservation(admin, { id: first.id, action: "confirm", revision: 1 }, now)
  const second = await send(payload({ preferredTime: "18:00", customerName: "Cruce Ada", customerPhone: "+56 9 1212 3434" }))
  await assert.rejects(
    () => transitionReservation(owner, { id: second.id, action: "confirm", revision: 1 }, now),
    (error) => error.code === "capacity_overlap",
  )
  await transitionReservation(owner, { id: second.id, action: "confirm", revision: 1, exceptionConfirmed: true, reason: "El salón se puede reorganizar" }, now)
  const stored = (await getDb().collection("reservations").doc(second.id).get()).data()
  assert.equal(stored?.status, "confirmed")
  assert.equal(stored?.exception?.by, owner.uid)
  const hold = (await getDb().collection("reservationHolds").doc(`${monday}_salon`).get()).data()
  assert.equal(Object.keys(hold?.bookings ?? {}).length, 2)
})

test("la misma mesa en horarios que se cruzan pide autorización", async () => {
  await seed([
    { id: "fixture-salon-1", zone: "salon", seats: 4, blocked: false },
    { id: "fixture-salon-2", zone: "salon", seats: 4, blocked: false },
  ])
  const first = await send(payload())
  await transitionReservation(admin, { id: first.id, action: "confirm", revision: 1, tableLabel: "Mesa 12" }, now)
  const second = await send(payload({ customerName: "Mesa Ada", customerPhone: "+56 9 2323 4545" }))
  await assert.rejects(
    () => transitionReservation(admin, { id: second.id, action: "confirm", revision: 1, tableLabel: "Mesa 12" }, now),
    (error) => error.code === "capacity_table",
  )
  await transitionReservation(admin, { id: second.id, action: "confirm", revision: 1, tableLabel: "Mesa 12", exceptionConfirmed: true, reason: "Comparten la mesa un rato" }, now)
  const stored = (await getDb().collection("reservations").doc(second.id).get()).data()
  assert.equal(stored?.tableLabel, "Mesa 12")
  assert.equal(stored?.assignedTableIds.includes("Mesa 12"), false)
})

test("el personal registra una reserva manual y puede dejarla sin mesa", async () => {
  const created = await createStaffReservation(
    admin,
    {
      customerName: "Teléfono Ada",
      customerPhone: "+56 9 2887 3619",
      date: monday,
      preferredTime: "19:00",
      partySize: 2,
      preferredZone: "salon",
      notes: "Llamó al local",
      confirm: true,
    },
    now,
  )
  assert.equal(created.status, "confirmed")
  assert.equal(created.tableLabel, null)
  const stored = (await getDb().collection("reservations").doc(created.id).get()).data()
  assert.equal(stored?.createdSource, "staff")
  assert.equal(stored?.trackingId, "")
  const big = await createStaffReservation(
    owner,
    {
      customerName: "Grupo Local",
      customerPhone: "+56 9 8765 4321",
      date: monday,
      preferredTime: "19:00",
      partySize: 10,
      preferredZone: "salon",
      confirm: true,
      exceptionConfirmed: true,
      exceptionReason: "Juntamos mesas en el salón",
      tableLabel: "Salón fondo",
    },
    now,
  )
  assert.equal(big.status, "confirmed")
  assert.equal(big.tableLabel, "Salón fondo")
  assert.deepEqual(big.assignedTableIds, [])
})

test("los avisos se guardan una sola vez y un rol sin acceso no los lee", async () => {
  const created = await send(payload({ customerName: "Aviso Ada", customerPhone: "+56 9 3434 5656" }))
  const parts = santiagoParts(now)
  const soonMin = parts.minutes + 20
  const soon = `${String(Math.floor(soonMin / 60)).padStart(2, "0")}:${String(soonMin % 60).padStart(2, "0")}`
  await createStaffReservation(
    admin,
    {
      customerName: "Pronto Ada",
      customerPhone: "+56 9 4545 6767",
      date: todayIsoInSantiago(now),
      preferredTime: soon,
      partySize: 2,
      preferredZone: "salon",
      confirm: true,
      exceptionConfirmed: true,
      exceptionReason: "Entra antes del horario de la web",
    },
    now,
  )
  const earlier = new Date(now.getTime() - 21 * 60 * 1000)
  const waiting = readPublicBody(JSON.stringify(payload({ customerName: "Espera Ada", customerPhone: "+56 9 5656 7878" })), earlier)
  await createPublicReservation(waiting, "203.0.113.41", earlier)

  await listStaffNotices(admin, now)
  await listStaffNotices(owner, now)
  const docs = await getDb().collection("staffNotifications").get()
  const of = (type) => docs.docs.filter((item) => item.data().type === type)
  assert.equal(of("created").filter((item) => item.data().reservationId === created.id).length, 1)
  assert.equal(of("upcoming").length, 1)
  assert.equal(of("attention").length, 1)
  assert.match(of("upcoming")[0].data().body, /comienza en 20 minutos/)

  const listed = await listStaffNotices(admin, now)
  await markStaffNoticesRead(admin, listed.map((item) => item.id))
  const reread = await listStaffNotices(admin, now)
  assert.equal(reread.every((item) => item.unread === false), true)
  await assert.rejects(() => listStaffNotices(null, now), (error) => error instanceof StaffAccessError)
})
