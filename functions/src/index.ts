import { initializeApp } from "firebase-admin/app"
import { getFirestore, type Firestore } from "firebase-admin/firestore"
import { onSchedule } from "firebase-functions/v2/scheduler"
import { google } from "googleapis"

import { collections } from "@/lib/firebase/model"
import {
  mailActivationSince,
  mailDeliveryMode,
  mailJobFromRecord,
  recoverable,
  recoverReservationMail,
  type MailJob,
  type MailStore,
  type ReservationMailSnapshot,
} from "@/lib/reservations/mail/dispatch"
import type { MailKind } from "@/lib/reservations/mail/render"
import { mailLinks, resendTransport } from "@/lib/reservations/mail/resend"
import { storedReservationEmail } from "@/lib/reservations/email"
import { unwrapTrackingSecret } from "@/lib/reservations/tracking"
import type { ReservationStatus, ReservationZone } from "@/lib/reservations/types"

import type { BackupDatabase } from "../../src/lib/reservations/backup-source"
import { backupDriveClient, type GoogleDriveApi } from "../../src/lib/reservations/backup-drive-client"
import { backupServiceAccount, runReservationDriveBackup } from "../../src/lib/reservations/backup-drive"

initializeApp()

function cloudDrive() {
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/drive"],
  })
  return backupDriveClient(google.drive({ version: "v3", auth }) as unknown as GoogleDriveApi)
}

const reservationBackup = onSchedule(
  {
    schedule: "every 1 hours",
    timeZone: "America/Santiago",
    region: "us-central1",
    serviceAccount: backupServiceAccount,
    memory: "512MiB",
    timeoutSeconds: 120,
    minInstances: 0,
    maxInstances: 1,
    concurrency: 1,
    retryCount: 0,
  },
  async () => {
    const result = await runReservationDriveBackup(getFirestore() as unknown as BackupDatabase, cloudDrive())
    if (!result.ok) throw new Error(`reservation_backup_failed:${result.alert}`)
  },
)

function reservationStatus(value: unknown): ReservationStatus | null {
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

function reservationZone(value: unknown): ReservationZone | null {
  return value === "salon" || value === "terrace" ? value : null
}

function mailStore(db: Firestore): MailStore {
  const col = db.collection(collections.reservationMail)
  return {
    async read(id) {
      const snap = await col.doc(id).get()
      return snap.exists ? mailJobFromRecord(snap.data() as Record<string, unknown> | undefined) : null
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
        const current = snap.exists ? mailJobFromRecord(snap.data() as Record<string, unknown> | undefined) : null
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
        const job = mailJobFromRecord(doc.data() as Record<string, unknown>)
        if (!job || !recoverable(job, now)) continue
        items.push({ id: doc.id, job })
        if (items.length >= capped) break
      }
      return items
    },
  }
}

async function loadSnapshot(db: Firestore, reservationId: string, kind: MailKind): Promise<ReservationMailSnapshot> {
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
    status: reservationStatus(data.status),
    email: storedReservationEmail(data.customerEmail),
    customerName: typeof data.customerName === "string" ? data.customerName : "",
    referenceCode: typeof data.referenceCode === "string" ? data.referenceCode : "",
    date: typeof data.date === "string" ? data.date : "",
    time: typeof data.preferredTime === "string" ? data.preferredTime : "",
    partySize: typeof data.partySize === "number" ? data.partySize : 0,
    zone: reservationZone(data.preferredZone),
    tableLabel: typeof data.tableLabel === "string" ? data.tableLabel : null,
    trackingToken,
  }
}

const reservationMailRecover = onSchedule(
  {
    schedule: "every 5 minutes",
    timeZone: "America/Santiago",
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 60,
    minInstances: 0,
    maxInstances: 1,
    concurrency: 1,
    retryCount: 0,
  },
  async () => {
    const env = process.env
    const mode = mailDeliveryMode(env)
    const since = mailActivationSince(env)
    if (mode !== "ready" || !since) return
    const db = getFirestore()
    await recoverReservationMail(mailStore(db), (reservationId, kind) => loadSnapshot(db, reservationId, kind), resendTransport(env), mode, mailLinks(env), {
      since,
    })
  },
)

export { reservationBackup, reservationMailRecover }
