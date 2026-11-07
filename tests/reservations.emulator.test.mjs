import test from "node:test"
import assert from "node:assert/strict"

import { StaffAccessError } from "@/server/auth/authorization"
import { getDb } from "@/server/firebase/firestore"
import { readPublicBody } from "@/lib/reservations/public-request"
import { todayIsoInSantiago, weekdayOf } from "@/lib/reservations/schedule"
import {
  createPublicReservation,
  getReservationForStaff,
  listReservationsForStaff,
  rateLimitPerHour,
  transitionReservation,
} from "@/server/reservations/service"

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
  assert.match(result.receipt.referenceCode, /^PIU-/)
  assert.equal(JSON.stringify(result.receipt).includes("2887"), false)
  const stored = await getDb().collection("reservations").doc(result.id).get()
  assert.equal(stored.data()?.status, "pending")
  assert.deepEqual(stored.data()?.assignedTableIds, [])
})

test("el mismo envío no crea dos documentos y otro envío sí es otra solicitud", async () => {
  const first = payload()
  const again = await send(first)
  const replay = await send(first)
  assert.equal(replay.duplicate, true)
  assert.equal(replay.receipt.referenceCode, again.receipt.referenceCode)
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

test("un horario cruzado, una mesa bloqueada, otra zona y un grupo grande no se confirman", async () => {
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
  await assert.rejects(
    () => transitionReservation(admin, { id: outside.id, action: "confirm", revision: 1 }, now),
    (error) => error.code === "capacity_zone"
  )

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
