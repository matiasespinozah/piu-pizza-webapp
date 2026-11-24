import type { ReservationStatus, ReservationZone } from "@/lib/reservations/types"

import { renderReservationMail, type MailKind } from "@/lib/reservations/mail/render"
import { MailDeliveryError } from "@/lib/reservations/mail/resend"

const mailAttempts = 3
const leaseMs = 2 * 60 * 1000
const idempotencyWindowMs = 24 * 60 * 60 * 1000
const recoverLimit = 20

type MailStatus = "queued" | "sending" | "sent" | "skipped" | "failed" | "requires_review"

type MailJob = {
  kind: MailKind
  reservationId: string
  status: MailStatus
  attempts: number
  reason: string | null
  resendId: string | null
  createdAt: string | null
  leaseUntil: string | null
  firstAttemptAt: string | null
  nextAttemptAt: string | null
  unknownOutcome: boolean
  claimToken: string | null
}

type MailStore = {
  read(id: string): Promise<MailJob | null>
  insert(id: string, job: MailJob): Promise<boolean>
  /** Lee y escribe en una sola transacción. `null` no cambia el documento. */
  commit(id: string, change: (job: MailJob | null) => MailJob | null): Promise<MailJob | null>
  listDue(now: Date, limit: number): Promise<Array<{ id: string; job: MailJob }>>
}

type ReservationMailSnapshot = {
  saved: boolean
  reservationId: string
  kind: MailKind
  status: ReservationStatus | null
  email: string | null
  customerName: string
  referenceCode: string
  date: string
  time: string
  partySize: number
  zone: ReservationZone | null
  tableLabel: string | null
  trackingToken: string | null
}

type MailTransport = (message: {
  to: string
  subject: string
  html: string
  text: string
  idempotencyKey: string
}) => Promise<{ id: string }>

type MailMode = "off" | "ready" | "misconfigured"

type MailOutcome =
  | { outcome: "not_saved" }
  | { outcome: "skipped"; reason: string }
  | { outcome: "held" }
  | { outcome: "sent"; id: string }
  | { outcome: "duplicate" }
  | { outcome: "failed"; reason: string }
  | { outcome: "in_flight" }
  | { outcome: "requires_review"; reason: string }

type MailClock = {
  now?: Date
  since?: string | null
  /** El barrido solo corre con fecha de activación. El envío inmediato no usa esto. */
  recover?: boolean
}

function mailJobFromRecord(value: Record<string, unknown> | undefined): MailJob | null {
  if (!value) return null
  const kind = value.kind === "received" || value.kind === "confirmed" ? value.kind : null
  const status: MailStatus | null =
    value.status === "queued" ||
    value.status === "sending" ||
    value.status === "sent" ||
    value.status === "skipped" ||
    value.status === "failed" ||
    value.status === "requires_review"
      ? value.status
      : null
  if (!kind || !status || typeof value.reservationId !== "string") return null
  const text = (field: unknown) => (typeof field === "string" && field ? field : null)
  return {
    kind,
    reservationId: value.reservationId,
    status,
    attempts: typeof value.attempts === "number" ? value.attempts : 0,
    reason: text(value.reason),
    resendId: text(value.resendId),
    createdAt: text(value.createdAt),
    leaseUntil: text(value.leaseUntil),
    firstAttemptAt: text(value.firstAttemptAt),
    nextAttemptAt: text(value.nextAttemptAt),
    unknownOutcome: value.unknownOutcome === true,
    claimToken: text(value.claimToken),
  }
}

function mailDocumentId(reservationId: string, kind: MailKind) {
  return `${reservationId}_${kind}`
}

function mailDeliveryMode(env: { PIU_RESERVATION_EMAILS?: string; RESEND_API_KEY?: string }): MailMode {
  if (env.PIU_RESERVATION_EMAILS?.trim().toLowerCase() !== "on") return "off"
  if (!env.RESEND_API_KEY?.trim()) return "misconfigured"
  return "ready"
}

/** ISO de activación. Vacío o inválido significa que el barrido no drena la cola. */
function mailActivationSince(env: { PIU_RESERVATION_EMAILS_SINCE?: string }) {
  const raw = env.PIU_RESERVATION_EMAILS_SINCE?.trim()
  if (!raw) return null
  const time = Date.parse(raw)
  if (Number.isNaN(time)) return null
  return new Date(time).toISOString()
}

function receivedStillApplies(status: ReservationStatus | null) {
  return status === "pending"
}

function confirmedStillApplies(status: ReservationStatus | null) {
  return status === "confirmed"
}

function trackingUrl(origin: string, token: string | null) {
  const base = origin.replace(/\/$/, "")
  if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) return `${base}/reservas/estado#${token}`
  return `${base}/reservas/estado`
}

function backoffMs(attempts: number) {
  return Math.min(60, 5 * 2 ** Math.max(attempts - 1, 0)) * 60 * 1000
}

function withinIdempotencyWindow(job: MailJob, now: Date) {
  if (!job.firstAttemptAt) return false
  return now.getTime() - Date.parse(job.firstAttemptAt) < idempotencyWindowMs
}

function beforeActivation(job: MailJob, since: string | null) {
  if (!since) return false
  if (!job.createdAt) return true
  return job.createdAt < since
}

function snapshotReady(snapshot: ReservationMailSnapshot) {
  if (!snapshot.email) return "no_email"
  if (!snapshot.customerName.trim() || !snapshot.referenceCode.trim() || !snapshot.date || !snapshot.time) return "invalid"
  if (!Number.isInteger(snapshot.partySize) || snapshot.partySize < 1) return "invalid"
  if (snapshot.zone !== "salon" && snapshot.zone !== "terrace") return "invalid"
  if (snapshot.kind === "received" && !receivedStillApplies(snapshot.status)) return "superseded"
  if (snapshot.kind === "confirmed" && !confirmedStillApplies(snapshot.status)) return "not_confirmed"
  return null
}

function recoverable(job: MailJob, now: Date) {
  if (job.status === "sent" || job.status === "skipped" || job.status === "requires_review") return false
  if (job.nextAttemptAt && job.nextAttemptAt > now.toISOString()) return false
  if (job.status === "sending") {
    if (job.resendId) return true
    if (job.leaseUntil && job.leaseUntil > now.toISOString()) return false
    return true
  }
  if (job.status === "failed" && job.attempts >= mailAttempts && !job.unknownOutcome) return false
  return job.status === "queued" || job.status === "failed"
}

async function skipJob(store: MailStore, id: string, snapshot: ReservationMailSnapshot, reason: string): Promise<MailOutcome> {
  const existing = await store.read(id)
  if (existing?.status === "sent") return { outcome: "duplicate" }
  if (existing?.status === "requires_review") return { outcome: "requires_review", reason: existing.reason ?? "requires_review" }
  const job: MailJob = {
    kind: snapshot.kind,
    reservationId: snapshot.reservationId,
    status: "skipped",
    attempts: existing?.attempts ?? 0,
    reason,
    resendId: existing?.resendId ?? null,
    createdAt: existing?.createdAt ?? null,
    leaseUntil: null,
    firstAttemptAt: existing?.firstAttemptAt ?? null,
    nextAttemptAt: null,
    unknownOutcome: false,
    claimToken: null,
  }
  if (!existing) await store.insert(id, job)
  else await store.commit(id, (current) => (current && current.status !== "sent" ? job : null))
  return { outcome: "skipped", reason }
}

function claimDecision(job: MailJob, now: Date, since: string | null): "send" | "review" | "wait" | "done" | "reconcile" | "before_activation" | "exhausted" {
  if (job.status === "sent" || job.status === "skipped") return "done"
  if (job.status === "requires_review") return "done"
  if (beforeActivation(job, since)) return "before_activation"
  if (job.status === "sending") {
    if (job.resendId) return "reconcile"
    if (job.leaseUntil && job.leaseUntil > now.toISOString()) return "wait"
    if (!withinIdempotencyWindow(job, now)) return "review"
    return "send"
  }
  if (job.unknownOutcome && !withinIdempotencyWindow(job, now)) return "review"
  if (job.attempts >= mailAttempts && !job.unknownOutcome) return "exhausted"
  if (job.nextAttemptAt && job.nextAttemptAt > now.toISOString()) return "wait"
  if (job.status === "queued" || job.status === "failed") return "send"
  return "wait"
}

async function placeReservationMail(
  store: MailStore,
  load: () => Promise<ReservationMailSnapshot>,
  transport: MailTransport | null,
  mode: MailMode,
  links: { origin: string; whatsappUrl: string; siteUrl: string; logoUrl: string },
  clock: MailClock = {},
): Promise<MailOutcome> {
  const now = clock.now ?? new Date()
  const since = clock.since ?? null
  const snapshot = await load()
  if (!snapshot.saved) return { outcome: "not_saved" }
  const id = mailDocumentId(snapshot.reservationId, snapshot.kind)
  if (snapshot.kind === "confirmed") {
    const receivedId = mailDocumentId(snapshot.reservationId, "received")
    await store.commit(receivedId, (received) => {
      if (!received || received.status !== "queued") return null
      return { ...received, status: "skipped", reason: "superseded", leaseUntil: null, nextAttemptAt: null }
    })
  }
  const block = snapshotReady(snapshot)
  if (block) return skipJob(store, id, snapshot, block)

  let job = await store.read(id)
  if (!job) {
    const createdAt = now.toISOString()
    await store.insert(id, {
      kind: snapshot.kind,
      reservationId: snapshot.reservationId,
      status: "queued",
      attempts: 0,
      reason: null,
      resendId: null,
      createdAt,
      leaseUntil: null,
      firstAttemptAt: null,
      nextAttemptAt: null,
      unknownOutcome: false,
      claimToken: null,
    })
    job = await store.read(id)
  }
  if (!job) return { outcome: "failed", reason: "store" }
  if (beforeActivation(job, since)) return skipJob(store, id, snapshot, "before_activation")
  if (clock.recover && !since) return { outcome: "held" }
  if (mode !== "ready" || !transport) return { outcome: "held" }

  const decision = claimDecision(job, now, since)
  if (decision === "done") return job.status === "sent" ? { outcome: "duplicate" } : { outcome: "skipped", reason: job.reason ?? "skipped" }
  if (decision === "wait") return job.status === "sending" ? { outcome: "in_flight" } : { outcome: "held" }
  if (decision === "exhausted") return { outcome: "failed", reason: "exhausted" }
  if (decision === "before_activation") return skipJob(store, id, snapshot, "before_activation")
  if (decision === "review") {
    await store.commit(id, (current) =>
      current
        ? {
            ...current,
            status: "requires_review",
            reason: "unknown_after_24h",
            leaseUntil: null,
            nextAttemptAt: null,
          }
        : null,
    )
    return { outcome: "requires_review", reason: "unknown_after_24h" }
  }
  if (decision === "reconcile" && job.resendId) {
    await store.commit(id, (current) =>
      current?.resendId
        ? { ...current, status: "sent", reason: null, leaseUntil: null, unknownOutcome: false, nextAttemptAt: null }
        : null,
    )
    return { outcome: "sent", id: job.resendId }
  }

  const leaseUntil = new Date(now.getTime() + leaseMs).toISOString()
  const claimToken = `${now.getTime()}-${Math.random().toString(16).slice(2)}`
  const claimed = await store.commit(id, (current) => {
    if (!current) return null
    const again = claimDecision(current, now, since)
    if (again !== "send") return null
    return {
      ...current,
      status: "sending",
      attempts: current.attempts + 1,
      reason: null,
      leaseUntil,
      claimToken,
      firstAttemptAt: current.firstAttemptAt ?? now.toISOString(),
      nextAttemptAt: null,
      unknownOutcome: false,
    }
  })
  if (!claimed || claimed.claimToken !== claimToken) {
    const latest = claimed ?? (await store.read(id))
    if (latest?.status === "sent") return { outcome: "duplicate" }
    if (latest?.status === "sending") return { outcome: "in_flight" }
    return { outcome: "held" }
  }

  const fresh = await load()
  const later = snapshotReady(fresh)
  if (!fresh.saved || later || !fresh.email || fresh.zone == null) {
    return skipJob(store, id, fresh.saved ? fresh : snapshot, later ?? "invalid")
  }

  let rendered: ReturnType<typeof renderReservationMail>
  try {
    rendered = renderReservationMail({
      kind: fresh.kind,
      customerName: fresh.customerName,
      referenceCode: fresh.referenceCode,
      date: fresh.date,
      time: fresh.time,
      partySize: fresh.partySize,
      zone: fresh.zone,
      tableLabel: fresh.tableLabel,
      trackingUrl: trackingUrl(links.origin, fresh.trackingToken),
      whatsappUrl: links.whatsappUrl,
      siteUrl: links.siteUrl,
      logoUrl: links.logoUrl,
    })
  } catch {
    await store.commit(id, (current) =>
      current ? { ...current, status: "failed", reason: "invalid", leaseUntil: null, unknownOutcome: false, nextAttemptAt: null } : null,
    )
    return { outcome: "failed", reason: "invalid" }
  }

  try {
    const sent = await transport({
      to: fresh.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      idempotencyKey: id,
    })
    await store.commit(id, (current) =>
      current
        ? { ...current, status: "sent", reason: null, resendId: sent.id, leaseUntil: null, unknownOutcome: false, nextAttemptAt: null }
        : null,
    )
    return { outcome: "sent", id: sent.id }
  } catch (error) {
    const unknown = error instanceof MailDeliveryError && error.unknown
    if (unknown) {
      const nextAttemptAt = new Date(now.getTime() + backoffMs(claimed.attempts)).toISOString()
      await store.commit(id, (current) =>
        current
          ? {
              ...current,
              status: "sending",
              reason: "unknown",
              unknownOutcome: true,
              leaseUntil: nextAttemptAt,
              nextAttemptAt,
              resendId: current.resendId,
            }
          : null,
      )
      return { outcome: "failed", reason: "unknown" }
    }
    const nextAttemptAt = claimed.attempts >= mailAttempts ? null : new Date(now.getTime() + backoffMs(claimed.attempts)).toISOString()
    await store.commit(id, (current) =>
      current
        ? {
            ...current,
            status: "failed",
            reason: claimed.attempts >= mailAttempts ? "exhausted" : "provider",
            unknownOutcome: false,
            leaseUntil: null,
            nextAttemptAt,
            resendId: current.resendId,
          }
        : null,
    )
    return { outcome: "failed", reason: claimed.attempts >= mailAttempts ? "exhausted" : "provider" }
  }
}

async function recoverReservationMail(
  store: MailStore,
  load: (reservationId: string, kind: MailKind) => Promise<ReservationMailSnapshot>,
  transport: MailTransport | null,
  mode: MailMode,
  links: { origin: string; whatsappUrl: string; siteUrl: string; logoUrl: string },
  clock: { now?: Date; since?: string | null } = {},
) {
  const now = clock.now ?? new Date()
  const since = clock.since ?? null
  if (mode !== "ready" || !since) return { sent: 0, skipped: 0, reviewed: 0, held: true }
  const due = await store.listDue(now, recoverLimit)
  let sent = 0
  let skipped = 0
  let reviewed = 0
  for (const item of due) {
    const outcome = await placeReservationMail(
      store,
      () => load(item.job.reservationId, item.job.kind),
      transport,
      mode,
      links,
      { now, since, recover: true },
    )
    if (outcome.outcome === "sent") sent += 1
    if (outcome.outcome === "skipped") skipped += 1
    if (outcome.outcome === "requires_review") reviewed += 1
  }
  return { sent, skipped, reviewed, held: false }
}

export {
  backoffMs,
  claimDecision,
  confirmedStillApplies,
  idempotencyWindowMs,
  leaseMs,
  mailActivationSince,
  mailAttempts,
  mailDeliveryMode,
  mailDocumentId,
  placeReservationMail,
  recoverable,
  receivedStillApplies,
  recoverLimit,
  recoverReservationMail,
  mailJobFromRecord,
  trackingUrl,
}
export type { MailClock, MailJob, MailMode, MailOutcome, MailStatus, MailStore, MailTransport, ReservationMailSnapshot }
