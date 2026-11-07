import test from "node:test"
import assert from "node:assert/strict"

import { getDb } from "@/server/firebase/firestore"
import { readPublicBody } from "@/lib/reservations/public-request"
import { todayIsoInSantiago, weekdayOf } from "@/lib/reservations/schedule"
import { createTrackingSecret, hashTrackingSecret, trackingLimits } from "@/lib/reservations/tracking"
import { createPublicReservation, getReservationForStaff, transitionReservation } from "@/server/reservations/service"
import { issueReservationTracking, readPublicStatus, revokeReservationTracking } from "@/server/reservations/tracking"

assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "Estas pruebas solo corren dentro del emulador.")
assert.equal(process.env.GCLOUD_PROJECT, "demo-piu-pizza")
assert.equal(process.env.PIU_RESERVATION_STATUS, "on")
assert.notEqual(process.env.GCLOUD_PROJECT, "piu-pizza-cl")

const admin = { uid: "staff-admin", role: "admin", email: "ana@example.test", displayName: "Ana" }
const now = new Date("2026-11-07T18:00:00Z")
let ipCount = 20

function nextIp() {
  ipCount += 1
  return `203.0.113.${ipCount}`
}

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

async function send(raw, ip = nextIp()) {
  const input = readPublicBody(JSON.stringify(raw), now)
  const result = await createPublicReservation(input, ip, now)
  return { ...result, id: raw.idempotencyKey }
}

function assertPublic(value, token) {
  const json = JSON.stringify(value)
  for (const piece of ["2887", "Ana Soto", "cebolla", "staff-admin", "fixture-salon", "motivo interno", token]) {
    assert.equal(json.includes(piece), false)
  }
}

async function wipe() {
  const db = getDb()
  await db.recursiveDelete(db.collection("reservations"))
  await db.recursiveDelete(db.collection("reservationHolds"))
  await db.recursiveDelete(db.collection("reservationAccess"))
  await db.recursiveDelete(db.collection("reservationStatusRate"))
  await db.recursiveDelete(db.collection("reservationRate"))
}

test.before(async () => {
  await getDb().collection("restaurantSettings").doc("operations").set({
    timeZone: "America/Santiago",
    capacityReady: true,
    fixture: true,
    serviceMinutes: 90,
    tables: [
      { id: "fixture-salon-1", zone: "salon", seats: 4, blocked: false },
      { id: "fixture-terrace-1", zone: "terrace", seats: 2, blocked: false },
    ],
  })
})

test.beforeEach(wipe)

test("un enlace nuevo consulta la solicitud pendiente y no guarda el secreto", async () => {
  const created = await send(payload())
  const token = created.trackingToken
  const status = await readPublicStatus(token, nextIp(), now)
  assert.equal(status.status, "pending")
  assert.equal(status.referenceCode, created.receipt.referenceCode)
  assert.equal(status.date, monday)
  assert.equal(status.time, "18:00")
  assert.equal(status.partySize, 2)
  assert.equal(status.zone, "salon")
  assert.equal(status.proposal, null)
  assertPublic(status, token)
  const stored = await getDb().collection("reservations").doc(created.id).get()
  const access = await getDb().collection("reservationAccess").doc(hashTrackingSecret(token)).get()
  assert.equal(JSON.stringify(stored.data()).includes(token), false)
  assert.equal(access.exists, true)
  assert.equal(JSON.stringify(access.data()).includes(token), false)
  assert.equal(stored.data()?.revision, 1)
})

test("la misma clave devuelve el mismo enlace y no abre otra reserva", async () => {
  const first = payload()
  const created = await send(first)
  const replay = await send(first)
  assert.equal(replay.duplicate, true)
  assert.equal(replay.trackingToken, created.trackingToken)
  assert.equal((await getDb().collection("reservations").get()).size, 1)
  assert.equal((await getDb().collection("reservationAccess").get()).size, 1)
  const status = await readPublicStatus(replay.trackingToken, nextIp(), now)
  assert.equal(status.referenceCode, created.receipt.referenceCode)
})

test("confirmar, llegar y finalizar se ven en la consulta, sin la mesa ni el trabajador", async () => {
  const created = await send(payload())
  await transitionReservation(admin, { id: created.id, action: "confirm", revision: 1 }, now)
  const confirmed = await readPublicStatus(created.trackingToken, nextIp(), now)
  assert.equal(confirmed.status, "confirmed")
  assertPublic(confirmed, created.trackingToken)
  await transitionReservation(admin, { id: created.id, action: "arrive", revision: 2 }, now)
  assert.equal((await readPublicStatus(created.trackingToken, nextIp(), now)).status, "arrived")
  await transitionReservation(admin, { id: created.id, action: "complete", revision: 3 }, now)
  assert.equal((await readPublicStatus(created.trackingToken, nextIp(), now)).status, "completed")
  assert.equal((await getDb().collection("reservations").doc(created.id).get()).data()?.revision, 4)
})

test("rechazar, proponer y cancelar se reflejan sin el motivo interno", async () => {
  const rejected = await send(payload())
  await transitionReservation(admin, { id: rejected.id, action: "reject", revision: 1, reason: "motivo interno" }, now)
  const rejectedStatus = await readPublicStatus(rejected.trackingToken, nextIp(), now)
  assert.equal(rejectedStatus.status, "rejected")
  assertPublic(rejectedStatus, rejected.trackingToken)

  const change = await send(payload({ preferredZone: "terrace", partySize: 2 }))
  await transitionReservation(
    admin,
    { id: change.id, action: "propose", revision: 1, proposedDate: monday, proposedTime: "19:00", proposedZone: "terrace" },
    now
  )
  const proposed = await readPublicStatus(change.trackingToken, nextIp(), now)
  assert.equal(proposed.status, "reschedule_requested")
  assert.equal(proposed.date, monday)
  assert.equal(proposed.time, "18:00")
  assert.deepEqual(proposed.proposal, { date: monday, time: "19:00", zone: "terrace" })

  const cancelled = await send(payload())
  await transitionReservation(admin, { id: cancelled.id, action: "cancel", revision: 1 }, now)
  assert.equal((await readPublicStatus(cancelled.trackingToken, nextIp(), now)).status, "cancelled")
})

test("un secreto inválido, alterado, ajeno o vencido no dice si la reserva existe", async () => {
  const created = await send(payload())
  const other = await send(payload({ customerName: "Luis Mora", customerPhone: "+56 9 8765 4321" }))
  const ip = nextIp()
  await assert.rejects(() => readPublicStatus("hola", ip, now), (error) => error.status === 400)
  await assert.rejects(() => readPublicStatus(created.receipt.referenceCode, ip, now), (error) => error.status === 404)
  await assert.rejects(() => readPublicStatus(other.receipt.referenceCode, ip, now), (error) => error.status === 404)
  const flipped = `${created.trackingToken.slice(0, 42)}${created.trackingToken.endsWith("A") ? "B" : "A"}`
  await assert.rejects(() => readPublicStatus(flipped, ip, now), (error) => error.status === 404)
  await assert.rejects(() => readPublicStatus(createTrackingSecret(), ip, now), (error) => error.status === 404)
  await getDb().collection("reservationAccess").doc(hashTrackingSecret(created.trackingToken)).update({ expiresOn: "2020-01-01" })
  await assert.rejects(() => readPublicStatus(created.trackingToken, ip, now), (error) => error.status === 404)
  const messages = []
  for (const credential of [created.receipt.referenceCode, flipped, createTrackingSecret()]) {
    await assert.rejects(() => readPublicStatus(credential, nextIp(), now), (error) => {
      messages.push(error.message)
      return error.status === 404 || error.status === 400
    })
  }
  assert.equal(new Set(messages).size, 1)
  const own = await readPublicStatus(other.trackingToken, nextIp(), now)
  assert.equal(own.referenceCode, other.receipt.referenceCode)
  assert.notEqual(own.referenceCode, created.receipt.referenceCode)
})

test("revocar el enlace lo inutiliza y el personal puede emitir otro sin dejar el secreto en el historial", async () => {
  const created = await send(payload())
  await revokeReservationTracking(admin, created.id, 1, now)
  await assert.rejects(() => readPublicStatus(created.trackingToken, nextIp(), now), (error) => error.status === 404)
  const replacement = await issueReservationTracking(admin, created.id, 2, now)
  assert.notEqual(replacement, created.trackingToken)
  const status = await readPublicStatus(replacement, nextIp(), now)
  assert.equal(status.referenceCode, created.receipt.referenceCode)
  await assert.rejects(() => readPublicStatus(created.trackingToken, nextIp(), now), (error) => error.status === 404)
  const events = await getDb().collection("reservations").doc(created.id).collection("events").get()
  const serialized = JSON.stringify(events.docs.map((item) => item.data()))
  assert.equal(serialized.includes(created.trackingToken), false)
  assert.equal(serialized.includes(replacement), false)
  const detail = await getReservationForStaff(admin, created.id)
  assert.equal(JSON.stringify(detail).includes(replacement), false)
  assert.equal(detail.tracking.state, "active")
})

test("una reserva anterior sigue en el panel y no se consulta con la referencia", async () => {
  const id = crypto.randomUUID()
  await getDb().collection("reservations").doc(id).set({
    referenceCode: "PIU-OLD1234",
    status: "pending",
    date: monday,
    preferredTime: "18:00",
    partySize: 2,
    preferredZone: "salon",
    customerName: "Ana Antigua",
    customerNameKey: "ana antigua",
    customerPhone: "+56 9 1111 1111",
    notes: "cumpleaños",
    createdAt: now,
    updatedAt: now,
    revision: 1,
  })
  const detail = await getReservationForStaff(admin, id)
  assert.equal(detail.referenceCode, "PIU-OLD1234")
  assert.equal(detail.tracking.state, "missing")
  await assert.rejects(() => readPublicStatus("PIU-OLD1234", nextIp(), now), (error) => error.status === 404)
  assert.equal((await getDb().collection("reservations").doc(id).get()).exists, true)
  assert.equal((await getDb().collection("reservationAccess").get()).size, 0)
})

test("consultar no cambia la reserva y varias lecturas concurrentes siguen siendo lectura", async () => {
  const created = await send(payload())
  await Promise.all(Array.from({ length: 6 }, () => readPublicStatus(created.trackingToken, nextIp(), now)))
  const stored = await getDb().collection("reservations").doc(created.id).get()
  assert.equal(stored.data()?.status, "pending")
  assert.equal(stored.data()?.revision, 1)
})

test("el tope de intentos fallidos es por la dirección de la plataforma, no por la primera", async () => {
  const { postReservationStatus } = await import("@/server/reservations/status-request")
  async function post(credential, forwarded) {
    const response = await postReservationStatus(
      new Request("http://localhost/api/reservations/status", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": forwarded },
        body: JSON.stringify({ credential }),
      })
    )
    return { status: response.status, cache: response.headers.get("cache-control"), body: await response.json() }
  }

  const created = await send(payload())
  const blocked = "198.51.100.9, 203.0.113.70"
  for (let index = 0; index < trackingLimits.failuresPerAddressPerHour; index += 1) {
    const attempt = await post(createTrackingSecret(), blocked)
    assert.equal(attempt.status, 404)
    assert.equal(attempt.cache, "private, no-store")
  }
  assert.equal((await post(createTrackingSecret(), blocked)).status, 429)
  const allowed = await post(created.trackingToken, "203.0.113.70, 203.0.113.71")
  assert.equal(allowed.status, 200)
  assert.equal(allowed.body.status.referenceCode, created.receipt.referenceCode)
  assertPublic(allowed.body, created.trackingToken)
  const rates = await getDb().collection("reservationStatusRate").get()
  const serialized = JSON.stringify(rates.docs.map((item) => item.data()))
  assert.equal(serialized.includes("203.0.113.70"), false)
  assert.equal(serialized.includes(created.trackingToken), false)
})

test("un mismo enlace no se puede consultar sin límite y la respuesta no se cachea", async () => {
  const { postReservationStatus } = await import("@/server/reservations/status-request")
  const created = await send(payload())
  const lines = []
  const methods = ["log", "info", "warn", "error", "debug"]
  const originals = Object.fromEntries(methods.map((method) => [method, console[method]]))
  for (const method of methods) {
    console[method] = (...args) => {
      lines.push(args.map((item) => String(item)).join(" "))
    }
  }
  try {
    for (let index = 0; index < trackingLimits.checksPerTokenPerHour; index += 1) {
      const response = await postReservationStatus(
        new Request("http://localhost/api/reservations/status", {
          method: "POST",
          headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.80" },
          body: JSON.stringify({ credential: created.trackingToken }),
        })
      )
      assert.equal(response.status, 200)
      assert.equal(response.headers.get("cache-control"), "private, no-store")
      assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow")
    }
    const limited = await postReservationStatus(
      new Request("http://localhost/api/reservations/status", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.81" },
        body: JSON.stringify({ credential: created.trackingToken }),
      })
    )
    assert.equal(limited.status, 429)
    const extra = await postReservationStatus(
      new Request("http://localhost/api/reservations/status", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.80" },
        body: JSON.stringify({ credential: created.trackingToken, status: "confirmed", customerPhone: "+56 9 2887 3619" }),
      })
    )
    assert.equal(extra.status, 400)
  } finally {
    for (const method of methods) console[method] = originals[method]
  }
  assert.equal(lines.some((line) => line.includes(created.trackingToken)), false)
  assert.equal((await getDb().collection("reservations").doc(created.id).get()).data()?.status, "pending")
})

test("sin el interruptor de lectura no se consulta, aunque las escrituras estén apagadas el enlace sigue leyéndose", async () => {
  const created = await send(payload())
  const previousStatus = process.env.PIU_RESERVATION_STATUS
  const previousWrites = process.env.PIU_RESERVATIONS_WRITES
  process.env.PIU_RESERVATION_STATUS = "off"
  try {
    await assert.rejects(() => readPublicStatus(created.trackingToken, nextIp(), now), (error) => error.status === 503)
  } finally {
    process.env.PIU_RESERVATION_STATUS = previousStatus
  }
  process.env.PIU_RESERVATIONS_WRITES = "off"
  try {
    assert.equal((await readPublicStatus(created.trackingToken, nextIp(), now)).status, "pending")
  } finally {
    process.env.PIU_RESERVATIONS_WRITES = previousWrites
  }
})
