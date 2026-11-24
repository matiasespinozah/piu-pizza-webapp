import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import { mailActivationSince, mailDeliveryMode, mailDocumentId, placeReservationMail, recoverable, recoverReservationMail, trackingUrl } from "@/lib/reservations/mail/dispatch"
import { MailDeliveryError } from "@/lib/reservations/mail/resend"
import { renderReservationMail } from "@/lib/reservations/mail/render"
import { formatVisitDate } from "@/lib/reservations/schedule"
import { whatsappHref } from "@/lib/site"

const token = "a".repeat(43)
const links = {
  origin: "https://piupizzas.cl",
  siteUrl: "https://piupizzas.cl",
  whatsappUrl: whatsappHref,
  logoUrl: "https://piupizzas.cl/logos/logopiu.png",
}

function memory() {
  const docs = new Map()
  return {
    docs,
    async read(id) {
      return docs.has(id) ? structuredClone(docs.get(id)) : null
    },
    async insert(id, job) {
      if (docs.has(id)) return false
      docs.set(id, structuredClone(job))
      return true
    },
    async commit(id, change) {
      const current = docs.has(id) ? structuredClone(docs.get(id)) : null
      const next = change(current)
      if (!next) return current
      docs.set(id, structuredClone(next))
      return structuredClone(next)
    },
    async listDue(now, limit) {
      const items = []
      for (const [id, job] of docs) {
        if (!recoverable(job, now)) continue
        items.push({ id, job: structuredClone(job) })
        if (items.length >= limit) break
      }
      return items
    },
  }
}

function snap(overrides = {}) {
  return {
    saved: true,
    reservationId: "res-1",
    kind: "received",
    status: "pending",
    email: "ana@example.test",
    customerName: "Ana Soto",
    referenceCode: "PIU-4821",
    date: "2026-11-27",
    time: "21:30",
    partySize: 4,
    zone: "terrace",
    tableLabel: null,
    trackingToken: token,
    ...overrides,
  }
}

function senderOf(failTimes = 0) {
  const messages = []
  let failures = 0
  return {
    messages,
    async send(message) {
      if (failures < failTimes) {
        failures += 1
        throw new Error("provider")
      }
      messages.push(message)
      return { id: `resend-${messages.length}` }
    },
  }
}

async function place(store, current, transport, mode, clock) {
  return placeReservationMail(store, async () => current, transport, mode, links, clock)
}

test("una reserva guardada prepara el correo de solicitud y una no guardada no", async () => {
  const store = memory()
  const sent = senderOf()
  const missing = await place(memory(), { ...snap(), saved: false }, sent.send, "ready")
  assert.equal(missing.outcome, "not_saved")
  assert.equal(sent.messages.length, 0)
  const created = await place(store, snap(), sent.send, "ready")
  assert.equal(created.outcome, "sent")
  assert.equal(sent.messages.length, 1)
  assert.match(sent.messages[0].subject, /Recibimos tu solicitud/)
  assert.equal(sent.messages[0].idempotencyKey, mailDocumentId("res-1", "received"))
  assert.equal(store.docs.get(mailDocumentId("res-1", "received")).status, "sent")
})

test("el correo de solicitud queda en cola si el envío está apagado", async () => {
  const store = memory()
  const sent = senderOf()
  const held = await place(store, snap(), sent.send, "off")
  assert.equal(held.outcome, "held")
  assert.equal(sent.messages.length, 0)
  assert.equal(store.docs.get(mailDocumentId("res-1", "received")).status, "queued")
})

test("confirmar envía el segundo correo y una reserva pendiente no", async () => {
  const pending = await place(memory(), snap({ kind: "confirmed", status: "pending" }), senderOf().send, "ready")
  assert.equal(pending.outcome, "skipped")
  assert.equal(pending.reason, "not_confirmed")
  const sent = senderOf()
  const confirmed = await place(memory(), snap({ kind: "confirmed", status: "confirmed", tableLabel: "Terraza 4" }), sent.send, "ready")
  assert.equal(confirmed.outcome, "sent")
  assert.match(sent.messages[0].subject, /confirmada/)
  assert.match(sent.messages[0].html, /Terraza 4/)
  assert.equal(sent.messages[0].html.includes("Recibimos tu solicitud de reserva"), false)
})

test("un evento repetido y un reintento usan la misma clave y no duplican un envío hecho", async () => {
  const store = memory()
  const sent = senderOf(1)
  const start = new Date("2026-11-01T12:00:00Z")
  const failed = await place(store, snap(), sent.send, "ready", { now: start })
  assert.equal(failed.outcome, "failed")
  assert.equal(failed.reason, "provider")
  const job = store.docs.get(mailDocumentId("res-1", "received"))
  assert.equal(job.status, "failed")
  assert.equal(job.attempts, 1)
  const tooSoon = await place(store, snap(), sent.send, "ready", { now: new Date(start.getTime() + 1000) })
  assert.equal(tooSoon.outcome, "held")
  assert.equal(sent.messages.length, 0)
  const again = await place(store, snap(), sent.send, "ready", { now: new Date(Date.parse(job.nextAttemptAt) + 1000) })
  assert.equal(again.outcome, "sent")
  assert.equal(sent.messages.length, 1)
  assert.equal(sent.messages[0].idempotencyKey, mailDocumentId("res-1", "received"))
  const duplicate = await place(store, snap(), sent.send, "ready", { now: new Date(Date.parse(job.nextAttemptAt) + 2000) })
  assert.equal(duplicate.outcome, "duplicate")
  assert.equal(sent.messages.length, 1)
})

test("dos envíos simultáneos reclaman la tarea una sola vez", async () => {
  const store = memory()
  const sent = senderOf()
  const results = await Promise.all([place(store, snap(), sent.send, "ready"), place(store, snap(), sent.send, "ready")])
  assert.equal(sent.messages.length, 1)
  assert.equal(results.filter((item) => item.outcome === "sent").length, 1)
})

test("un envío en curso o agotado no dispara otro correo", async () => {
  const flying = memory()
  const id = mailDocumentId("res-1", "received")
  const now = new Date("2026-11-01T12:00:00Z")
  await flying.insert(id, {
    kind: "received",
    reservationId: "res-1",
    status: "sending",
    attempts: 1,
    reason: null,
    resendId: null,
    createdAt: now.toISOString(),
    leaseUntil: new Date(now.getTime() + 60_000).toISOString(),
    firstAttemptAt: now.toISOString(),
    nextAttemptAt: null,
    unknownOutcome: false,
  })
  const sent = senderOf()
  assert.equal((await place(flying, snap(), sent.send, "ready", { now })).outcome, "in_flight")
  const tired = memory()
  await tired.insert(id, {
    kind: "received",
    reservationId: "res-1",
    status: "failed",
    attempts: 3,
    reason: "provider",
    resendId: null,
    createdAt: now.toISOString(),
    leaseUntil: null,
    firstAttemptAt: now.toISOString(),
    nextAttemptAt: null,
    unknownOutcome: false,
  })
  assert.equal((await place(tired, snap(), sent.send, "ready", { now })).outcome, "failed")
  assert.equal(sent.messages.length, 0)
})

test("un resultado desconocido se reintenta dentro de 24 horas y después queda para revisión", async () => {
  const store = memory()
  const start = new Date("2026-11-01T12:00:00Z")
  let calls = 0
  const transport = async () => {
    calls += 1
    if (calls === 1) throw new MailDeliveryError(true)
    return { id: "resend-1" }
  }
  const unknown = await place(store, snap(), transport, "ready", { now: start })
  assert.equal(unknown.outcome, "failed")
  assert.equal(unknown.reason, "unknown")
  const job = store.docs.get(mailDocumentId("res-1", "received"))
  assert.equal(job.unknownOutcome, true)
  assert.equal(job.resendId, null)
  const later = new Date(Date.parse(job.leaseUntil) + 1000)
  const retried = await place(store, snap(), transport, "ready", { now: later })
  assert.equal(retried.outcome, "sent")
  assert.equal(calls, 2)
  const stuck = memory()
  const old = new Date("2026-11-01T12:00:00Z")
  await stuck.insert(mailDocumentId("res-1", "received"), {
    ...job,
    status: "sending",
    unknownOutcome: true,
    resendId: null,
    firstAttemptAt: old.toISOString(),
    leaseUntil: old.toISOString(),
    nextAttemptAt: old.toISOString(),
  })
  const quiet = senderOf()
  const review = await place(stuck, snap(), quiet.send, "ready", { now: new Date(old.getTime() + 25 * 60 * 60 * 1000) })
  assert.equal(review.outcome, "requires_review")
  assert.equal(quiet.messages.length, 0)
  assert.equal(stuck.docs.get(mailDocumentId("res-1", "received")).status, "requires_review")
  assert.equal(stuck.docs.get(mailDocumentId("res-1", "received")).resendId, null)
})

test("sin correo no intenta enviar", async () => {
  const store = memory()
  const sent = senderOf()
  const skipped = await place(store, snap({ email: null }), sent.send, "ready")
  assert.equal(skipped.outcome, "skipped")
  assert.equal(skipped.reason, "no_email")
  assert.equal(sent.messages.length, 0)
})

test("si la reserva ya está confirmada no sale el correo de solicitud", async () => {
  const store = memory()
  const sent = senderOf()
  await place(store, snap(), null, "off")
  const confirmed = await place(store, snap({ kind: "confirmed", status: "confirmed" }), sent.send, "ready")
  assert.equal(confirmed.outcome, "sent")
  assert.equal(store.docs.get(mailDocumentId("res-1", "received")).status, "skipped")
  assert.equal(store.docs.get(mailDocumentId("res-1", "received")).reason, "superseded")
  assert.equal(sent.messages.length, 1)
  assert.match(sent.messages[0].subject, /confirmada/)
})

test("el html escapa el nombre, usa el código real y el horario de Chile", () => {
  const visit = formatVisitDate("2026-11-27")
  assert.match(visit, /27/)
  assert.match(visit, /noviembre/)
  assert.equal(visit.includes("26"), false)
  const rendered = renderReservationMail({
    kind: "received",
    customerName: `Ana <script> & "Più"`,
    referenceCode: "PIU-4821",
    date: "2026-11-27",
    time: "21:30",
    partySize: 4,
    zone: "salon",
    tableLabel: null,
    trackingUrl: trackingUrl("https://piupizzas.cl", token),
    whatsappUrl: whatsappHref,
    siteUrl: "https://piupizzas.cl",
    logoUrl: "https://piupizzas.cl/logos/logopiu.png",
  })
  assert.equal(rendered.html.includes("<script>"), false)
  assert.match(rendered.html, /Ana &lt;script&gt; &amp; &quot;Più&quot;/)
  assert.match(rendered.html, /PIU-4821/)
  assert.match(rendered.html, /Pendiente de confirmación/)
  assert.equal(rendered.html.includes("¡Tu reserva está confirmada!"), false)
  assert.equal(rendered.html.includes("Mesa"), false)
  assert.match(rendered.html, /Salón/)
  assert.match(rendered.html, new RegExp(visit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  assert.match(rendered.html, /21:30 hrs/)
  assert.match(rendered.html, /name="viewport"/)
  assert.match(rendered.html, /max-width:600px/)
  assert.match(rendered.html, /logos\/logopiu\.png/)
  assert.match(rendered.text, /PIU-4821/)
  assert.match(rendered.text, /21:30 hrs/)
  assert.equal(rendered.text.includes("<table"), false)
  assert.equal(trackingUrl("https://piupizzas.cl", token), `https://piupizzas.cl/reservas/estado#${token}`)
  assert.match(rendered.html, /reservas\/estado#a{43}/)
  assert.match(rendered.text, new RegExp(whatsappHref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  assert.match(rendered.html, /no respondas a este mensaje/)
})

test("sin la clave el modo real falla controlado y las pruebas pueden simular el envío", async () => {
  assert.equal(mailDeliveryMode({}), "off")
  assert.equal(mailDeliveryMode({ PIU_RESERVATION_EMAILS: "on" }), "misconfigured")
  assert.equal(mailDeliveryMode({ PIU_RESERVATION_EMAILS: "on", RESEND_API_KEY: "secreto" }), "ready")
  const store = memory()
  const held = await place(store, snap(), null, "misconfigured")
  assert.equal(held.outcome, "held")
  assert.equal(store.docs.get(mailDocumentId("res-1", "received")).status, "queued")
  assert.equal(store.docs.get(mailDocumentId("res-1", "received")).attempts, 0)
  assert.equal(mailActivationSince({}), null)
  assert.equal(mailActivationSince({ PIU_RESERVATION_EMAILS_SINCE: "no-es-fecha" }), null)
})

test("la fecha de activación descarta la cola vieja sin borrarla y el barrido no corre sin esa fecha", async () => {
  const store = memory()
  const sent = senderOf()
  const old = new Date("2026-01-01T00:00:00Z")
  await place(store, snap(), sent.send, "off", { now: old })
  await place(store, snap({ reservationId: "res-2" }), sent.send, "off", { now: new Date("2026-07-01T00:00:00Z") })
  const since = "2026-06-01T00:00:00.000Z"
  const held = await recoverReservationMail(store, async (id, kind) => snap({ reservationId: id, kind }), null, "ready", links, { since: null })
  assert.equal(held.held, true)
  assert.equal(sent.messages.length, 0)
  assert.equal(store.docs.get(mailDocumentId("res-1", "received")).status, "queued")
  const recovered = await recoverReservationMail(
    store,
    async (id, kind) => snap({ reservationId: id, kind }),
    sent.send,
    "ready",
    links,
    { now: new Date("2026-11-01T00:00:00Z"), since },
  )
  assert.equal(recovered.sent, 1)
  assert.equal(store.docs.get(mailDocumentId("res-1", "received")).status, "skipped")
  assert.equal(store.docs.get(mailDocumentId("res-1", "received")).reason, "before_activation")
  assert.equal(store.docs.get(mailDocumentId("res-2", "received")).status, "sent")
  const doc = readFileSync(new URL("../docs/arquitectura/correos-reservas.md", import.meta.url), "utf8")
  assert.match(doc, /sin suponer de antemano si son TXT, MX o CNAME/)
  const fn = readFileSync(new URL("../functions/src/index.ts", import.meta.url), "utf8")
  assert.match(fn, /schedule: "every 5 minutes"/)
  assert.match(fn, /region: "us-central1"/)
  assert.match(fn, /maxInstances: 1/)
  assert.match(fn, /const reservationBackup/)
  assert.match(fn, /reservationMailRecover/)
})

test("la reserva guarda el correo después de crearse y la confirmación no está dentro de la transacción", () => {
  const source = readFileSync(new URL("../src/server/reservations/service.ts", import.meta.url), "utf8")
  const create = source.slice(source.indexOf("async function createPublicReservation"), source.indexOf("function byVisit"))
  const transition = source.slice(source.indexOf("async function transitionReservation"), source.indexOf("type StaffReservationInput"))
  assert.ok(create.indexOf("runTransaction") < create.lastIndexOf("enqueueReservationMail"))
  assert.match(create, /kind: "received"/)
  assert.ok(transition.indexOf("runTransaction") < transition.lastIndexOf("enqueueReservationMail"))
  assert.match(transition, /notice\.action === "confirm"/)
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8")
  assert.match(rules, /match \/reservationMail\/\{mailId\}[\s\S]*allow read, write: if false/)
})
