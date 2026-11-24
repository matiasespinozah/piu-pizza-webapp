import "server-only"

import type { Firestore } from "firebase-admin/firestore"

import { collections } from "@/lib/firebase/model"
import { storedReservationEmail } from "@/lib/reservations/email"
import {
  mailActivationSince,
  mailDeliveryMode,
  mailJobFromRecord,
  placeReservationMail,
  recoverable,
  recoverReservationMail,
  type MailJob,
  type MailStore,
  type ReservationMailSnapshot,
} from "@/lib/reservations/mail/dispatch"
import type { MailKind } from "@/lib/reservations/mail/render"
import { mailLinks, resendTransport } from "@/lib/reservations/mail/resend"
import { unwrapTrackingSecret } from "@/lib/reservations/tracking"
import type { ReservationStatus, ReservationZone } from "@/lib/reservations/types"
import { getDb } from "@/server/firebase/firestore"

function asStatus(value: unknown): ReservationStatus | null {
  if (
    value === "pending" ||
    value === "confirmed" ||
    value === "rejected" ||
    value === "reschedule_requested" ||
    value === "cancelled" ||
    value === "arrived" ||
    value === "completed"
  ) {
    return value
  }
  return null
}

function asZone(value: unknown): ReservationZone | null {
  return value === "salon" || value === "terrace" ? value : null
}

function asJob(value: Record<string, unknown> | undefined) {
  return mailJobFromRecord(value)
}

function firestoreMailStore(db: Firestore): MailStore {
  const col = db.collection(collections.reservationMail)
  return {
    async read(id) {
      const snap = await col.doc(id).get()
      return snap.exists ? asJob(snap.data() as Record<string, unknown> | undefined) : null
    },
    async insert(id, job) {
      try {
        const now = new Date().toISOString()
        await col.doc(id).create({ ...job, createdAt: job.createdAt ?? now, updatedAt: now })
        return true
      } catch (error) {
        const code = typeof error === "object" && error && "code" in error ? String(error.code) : ""
        if (code === "6" || code === "already-exists") return false
        throw error
      }
    },
    async commit(id, change) {
      const ref = col.doc(id)
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref)
        const current = snap.exists ? asJob(snap.data() as Record<string, unknown> | undefined) : null
        const next = change(current)
        if (!next) return current
        const updatedAt = new Date().toISOString()
        tx.set(ref, { ...next, createdAt: next.createdAt ?? current?.createdAt ?? updatedAt, updatedAt }, { merge: true })
        return next
      })
    },
    async listDue(now, limit) {
      const capped = Math.min(Math.max(limit, 1), 20)
      const [queued, failed, sending] = await Promise.all([
        col.where("status", "==", "queued").limit(capped).get(),
        col.where("status", "==", "failed").limit(capped).get(),
        col.where("status", "==", "sending").limit(capped).get(),
      ])
      const items: Array<{ id: string; job: MailJob }> = []
      for (const doc of [...queued.docs, ...failed.docs, ...sending.docs]) {
        const job = asJob(doc.data() as Record<string, unknown>)
        if (!job || !recoverable(job, now)) continue
        items.push({ id: doc.id, job })
        if (items.length >= capped) break
      }
      return items
    },
  }
}

async function loadReservationMailSnapshot(reservationId: string, kind: MailKind): Promise<ReservationMailSnapshot> {
  const empty: ReservationMailSnapshot = {
    saved: false,
    reservationId,
    kind,
    status: null,
    email: null,
    customerName: "",
    referenceCode: "",
    date: "",
    time: "",
    partySize: 0,
    zone: null,
    tableLabel: null,
    trackingToken: null,
  }
  const db = getDb()
  const snap = await db.collection(collections.reservations).doc(reservationId).get()
  if (!snap.exists) return empty
  const data = snap.data() ?? {}
  const trackingId = typeof data.trackingId === "string" ? data.trackingId : ""
  let trackingToken: string | null = null
  if (trackingId) {
    const access = await db.collection(collections.reservationAccess).doc(trackingId).get()
    const wrapped = access.get("wrapped")
    if (access.exists && access.get("revokedAt") == null && typeof wrapped === "string") {
      trackingToken = unwrapTrackingSecret(wrapped, reservationId)
    }
  }
  return {
    saved: true,
    reservationId,
    kind,
    status: asStatus(data.status),
    email: storedReservationEmail(data.customerEmail),
    customerName: typeof data.customerName === "string" ? data.customerName : "",
    referenceCode: typeof data.referenceCode === "string" ? data.referenceCode : "",
    date: typeof data.date === "string" ? data.date : "",
    time: typeof data.preferredTime === "string" ? data.preferredTime : "",
    partySize: typeof data.partySize === "number" ? data.partySize : 0,
    zone: asZone(data.preferredZone),
    tableLabel: typeof data.tableLabel === "string" ? data.tableLabel : null,
    trackingToken,
  }
}

function openMail(env: Record<string, string | undefined>) {
  const mode = mailDeliveryMode(env)
  return {
    mode,
    since: mailActivationSince(env),
    transport: mode === "ready" ? resendTransport(env) : null,
    links: mailLinks(env),
  }
}

async function enqueueReservationMail(input: { reservationId: string; kind: MailKind }, env: Record<string, string | undefined> = process.env) {
  const opened = openMail(env)
  try {
    return await placeReservationMail(
      firestoreMailStore(getDb()),
      () => loadReservationMailSnapshot(input.reservationId, input.kind),
      opened.transport,
      opened.mode,
      opened.links,
      { since: opened.since },
    )
  } catch {
    console.error(JSON.stringify({ event: "reservation_mail_failed", reservationId: input.reservationId, kind: input.kind, reason: "store" }))
    return { outcome: "failed" as const, reason: "store" }
  }
}

async function sweepReservationMail(env: Record<string, string | undefined> = process.env) {
  const opened = openMail(env)
  try {
    return await recoverReservationMail(
      firestoreMailStore(getDb()),
      loadReservationMailSnapshot,
      opened.transport,
      opened.mode,
      opened.links,
      { since: opened.since },
    )
  } catch {
    console.error(JSON.stringify({ event: "reservation_mail_recover_failed", reason: "store" }))
    return { sent: 0, skipped: 0, reviewed: 0, held: true }
  }
}

export { enqueueReservationMail, sweepReservationMail }
