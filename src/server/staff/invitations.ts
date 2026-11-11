import "server-only"

import { randomBytes } from "node:crypto"
import { getAuth, type UserRecord } from "firebase-admin/auth"
import type { DocumentReference } from "firebase-admin/firestore"

import type { StaffSession } from "@/lib/auth/roles"
import { readStaffRole } from "@/lib/auth/roles"
import { authTimeIsFresh } from "@/lib/auth/session-policy"
import { auditLogSchema, collections, invitationSchema, staffDirectorySchema } from "@/lib/firebase/model"
import {
  InviteError,
  createInviteToken,
  hashInviteBucket,
  hashInviteToken,
  invitationPhase,
  inviteLifetimeMs,
  inviteTokenPattern,
  normalizeStaffEmail,
  staffEmailIsValid,
  type InvitationPhase,
} from "@/lib/staff/invitation"
import { assertStaff } from "@/server/auth/authorization"
import { assertFirebaseDataEnabled } from "@/server/firebase/guard"
import { getAdminApp } from "@/server/firebase/admin"
import { getDb } from "@/server/firebase/firestore"
import { firebaseDataAccessEnabled } from "@/lib/firebase/access"

const addressLimitPerHour = 20
const tokenLimitPerHour = 8
const lockMs = 30_000

type InvitationView = {
  id: string
  email: string
  phase: InvitationPhase
  expiresAt: string
  createdAt: string
  usedAt: string | null
}

type CreatedInvitation = {
  email: string
  expiresAt: string
  token: string
}

type RedeemInput = {
  token: string
  name: string
  email: string
  password: string
  address: string
  now?: number
}

type RedeemedInvitation = {
  emailVerified: boolean
  accountExists?: boolean
}

function auth() {
  return getAuth(getAdminApp())
}

function invites() {
  return getDb().collection(collections.invitations)
}

async function countAttempt(bucket: string, limit: number, now: number) {
  const hour = Math.floor(now / 3_600_000)
  const ref = getDb().collection(collections.invitationRate).doc(hashInviteBucket(`${bucket}:${hour}`))
  await getDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const count = Number(snap.get("count") ?? 0)
    if (count >= limit) throw new InviteError("rate")
    tx.set(ref, { count: count + 1 })
  })
}

async function userByEmail(email: string) {
  try {
    return await auth().getUserByEmail(email)
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : ""
    if (code === "auth/user-not-found") return null
    throw new InviteError("unavailable")
  }
}

function assertCanJoin(user: UserRecord | null) {
  if (!user) return
  if (user.disabled) throw new InviteError("disabled")
  if (readStaffRole(user.customClaims?.role)) throw new InviteError("exists")
}

async function createStaffInvitation(actor: StaffSession, email: string, now = Date.now()): Promise<CreatedInvitation> {
  assertFirebaseDataEnabled()
  assertStaff(actor, ["superadmin"])
  const existing = await userByEmail(email)
  assertCanJoin(existing)

  const token = createInviteToken()
  const id = hashInviteToken(token)
  const createdAt = new Date(now).toISOString()
  const expiresAt = new Date(now + inviteLifetimeMs).toISOString()
  const record = invitationSchema.parse({
    email,
    expiresAt,
    createdAt,
    createdBy: actor.uid,
    status: "open",
    usedAt: null,
    usedBy: null,
    lockId: null,
    lockUntil: null,
  })
  await invites().doc(id).create(record)
  await getDb().collection(collections.auditLogs).add(
    auditLogSchema.parse({
      actorUid: actor.uid,
      action: "staff.invite.create",
      targetPath: `${collections.invitations}/${id}`,
      summary: "Se creó una invitación de personal.",
      at: createdAt,
    })
  )
  return { email, expiresAt, token }
}

async function listStaffInvitations(actor: StaffSession, now = Date.now()): Promise<InvitationView[]> {
  assertFirebaseDataEnabled()
  assertStaff(actor, ["superadmin"])
  const snap = await invites().orderBy("createdAt", "desc").limit(40).get()
  const views: InvitationView[] = []
  for (const doc of snap.docs) {
    const parsed = invitationSchema.safeParse(doc.data())
    if (!parsed.success) continue
    views.push({
      id: doc.id,
      email: parsed.data.email,
      phase: invitationPhase(parsed.data.status, parsed.data.expiresAt, now),
      expiresAt: parsed.data.expiresAt,
      createdAt: parsed.data.createdAt,
      usedAt: parsed.data.usedAt,
    })
  }
  return views
}

async function revokeStaffInvitation(actor: StaffSession, id: string, now = Date.now()) {
  assertFirebaseDataEnabled()
  assertStaff(actor, ["superadmin"])
  if (!/^[a-f0-9]{64}$/.test(id)) throw new InviteError("invalid")
  const ref = invites().doc(id)
  await getDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) throw new InviteError("invalid")
    const parsed = invitationSchema.safeParse(snap.data())
    if (!parsed.success) throw new InviteError("invalid")
    if (parsed.data.status === "used") throw new InviteError("used")
    if (parsed.data.status === "revoked") return
    tx.update(ref, { status: "revoked", lockId: null, lockUntil: null })
  })
  await getDb().collection(collections.auditLogs).add(
    auditLogSchema.parse({
      actorUid: actor.uid,
      action: "staff.invite.revoke",
      targetPath: `${collections.invitations}/${id}`,
      summary: "Se revocó una invitación de personal.",
      at: new Date(now).toISOString(),
    })
  )
}

async function guardPublicAttempt(token: string, address: string, now: number) {
  await countAttempt(`address:${address || "unknown"}`, addressLimitPerHour, now)
  if (inviteTokenPattern.test(token)) {
    await countAttempt(`token:${hashInviteToken(token)}`, tokenLimitPerHour, now)
  }
}

async function readOpenInvite(token: string, email: string | null, now: number) {
  if (!inviteTokenPattern.test(token)) throw new InviteError("invalid")
  const ref = invites().doc(hashInviteToken(token))
  const snap = await ref.get()
  if (!snap.exists) throw new InviteError("invalid")
  const parsed = invitationSchema.safeParse(snap.data())
  if (!parsed.success) throw new InviteError("invalid")
  if (email && parsed.data.email !== email) throw new InviteError("mismatch")
  if (parsed.data.status === "revoked") throw new InviteError("revoked")
  if (parsed.data.status === "used") throw new InviteError("used")
  if (invitationPhase("open", parsed.data.expiresAt, now) === "expired") throw new InviteError("expired")
  return { ref, data: parsed.data }
}

async function previewStaffInvitation(token: string, address: string, now = Date.now()) {
  assertFirebaseDataEnabled()
  await guardPublicAttempt(token, address, now)
  const { data } = await readOpenInvite(token, null, now)
  const existing = await userByEmail(data.email)
  assertCanJoin(existing)
  return { email: data.email, accountExists: Boolean(existing) }
}

async function lockOpenInvite(token: string, email: string, now: number) {
  const id = hashInviteToken(token)
  const lockId = randomBytes(8).toString("hex")
  const ref = invites().doc(id)
  await getDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) throw new InviteError("invalid")
    const parsed = invitationSchema.safeParse(snap.data())
    if (!parsed.success) throw new InviteError("invalid")
    if (parsed.data.email !== email) throw new InviteError("mismatch")
    if (parsed.data.status === "revoked") throw new InviteError("revoked")
    if (parsed.data.status === "used") throw new InviteError("used")
    if (invitationPhase("open", parsed.data.expiresAt, now) === "expired") throw new InviteError("expired")
    const lockedUntil = parsed.data.lockUntil ? Date.parse(parsed.data.lockUntil) : 0
    if (parsed.data.lockId && lockedUntil > now) throw new InviteError("busy")
    tx.update(ref, { lockId, lockUntil: new Date(now + lockMs).toISOString() })
  })
  return { id, lockId, ref }
}

async function commitPending(ref: DocumentReference, lockId: string, uid: string, email: string, name: string, now: number) {
  const nowIso = new Date(now).toISOString()
  const accountRef = getDb().collection(collections.staff).doc(uid)
  let invitedBy = ""
  await getDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const parsed = invitationSchema.safeParse(snap.data())
    if (!parsed.success || parsed.data.lockId !== lockId) throw new InviteError("used")
    const previous = await tx.get(accountRef)
    const previousStatus = previous.get("status")
    if (previousStatus === "active" || previousStatus === "suspended") throw new InviteError("exists")
    invitedBy = parsed.data.createdBy
    const createdAt = typeof previous.get("createdAt") === "string" ? previous.get("createdAt") : nowIso
    tx.set(
      accountRef,
      staffDirectorySchema.parse({
        email,
        displayName: name,
        status: "pending",
        intendedRole: "admin",
        invitedBy,
        createdAt,
        updatedAt: nowIso,
      })
    )
    tx.update(ref, { status: "used", usedAt: nowIso, usedBy: uid, lockId: null, lockUntil: null })
  })
  await getDb().collection(collections.auditLogs).add(
    auditLogSchema.parse({
      actorUid: invitedBy,
      action: "staff.invite.redeem",
      targetPath: `${collections.staff}/${uid}`,
      summary: "Una invitación de personal quedó pendiente de aprobación.",
      at: nowIso,
    })
  )
}

async function releaseLock(id: string, lockId: string) {
  const ref = invites().doc(id)
  await getDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (snap.get("lockId") === lockId && snap.get("status") === "open") {
      tx.update(ref, { lockId: null, lockUntil: null })
    }
  })
}

async function redeemStaffInvitation(input: RedeemInput): Promise<RedeemedInvitation> {
  assertFirebaseDataEnabled()
  const now = input.now ?? Date.now()
  await guardPublicAttempt(input.token, input.address, now)
  await readOpenInvite(input.token, input.email, now)
  const existing = await userByEmail(input.email)
  assertCanJoin(existing)
  if (existing) throw new InviteError("sign-in")

  const locked = await lockOpenInvite(input.token, input.email, now)
  try {
    let uid = ""
    try {
      const created = await auth().createUser({
        email: input.email,
        password: input.password,
        displayName: input.name,
        emailVerified: false,
      })
      uid = created.uid
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : ""
      if (code === "auth/email-already-exists") throw new InviteError("sign-in")
      throw new InviteError("unavailable")
    }
    await commitPending(locked.ref, locked.lockId, uid, input.email, input.name, now)
    return { emailVerified: false }
  } catch (error) {
    await releaseLock(locked.id, locked.lockId).catch(() => undefined)
    if (error instanceof InviteError) throw error
    throw new InviteError("unavailable")
  }
}

async function linkStaffInvitation(input: { token: string; idToken: string; name: string; address: string; now?: number }) {
  assertFirebaseDataEnabled()
  const now = input.now ?? Date.now()
  await guardPublicAttempt(input.token, input.address, now)
  let decoded: { uid?: string; email?: unknown; auth_time?: unknown; role?: unknown }
  try {
    decoded = await auth().verifyIdToken(input.idToken, true)
  } catch {
    throw new InviteError("identity")
  }
  if (!authTimeIsFresh(decoded.auth_time, now)) throw new InviteError("identity")
  if (typeof decoded.uid !== "string" || !decoded.uid) throw new InviteError("identity")
  const email = normalizeStaffEmail(typeof decoded.email === "string" ? decoded.email : "")
  if (!staffEmailIsValid(email)) throw new InviteError("mismatch")
  if (readStaffRole(decoded.role)) throw new InviteError("exists")

  const user = await auth().getUser(decoded.uid)
  assertCanJoin(user)
  if (normalizeStaffEmail(user.email ?? "") !== email) throw new InviteError("mismatch")
  const staffSnap = await getDb().collection(collections.staff).doc(user.uid).get()
  const status = staffSnap.get("status")
  if (status === "active" || status === "suspended") throw new InviteError("exists")

  const locked = await lockOpenInvite(input.token, email, now)
  try {
    await commitPending(locked.ref, locked.lockId, user.uid, email, input.name, now)
    return { emailVerified: user.emailVerified === true }
  } catch (error) {
    await releaseLock(locked.id, locked.lockId).catch(() => undefined)
    if (error instanceof InviteError) throw error
    throw new InviteError("unavailable")
  }
}

type StaffDirectoryStatus = "pending" | "active" | "rejected" | "suspended" | "unavailable"

async function staffDirectoryStatus(uid: string): Promise<StaffDirectoryStatus | null> {
  if (!firebaseDataAccessEnabled()) return null
  if (!/^[A-Za-z0-9]{10,128}$/.test(uid)) return null
  try {
    const snap = await getDb().collection(collections.staff).doc(uid).get()
    if (!snap.exists) return null
    const status = snap.get("status")
    if (status === "pending" || status === "active" || status === "rejected" || status === "suspended") return status
    return "unavailable"
  } catch {
    return "unavailable"
  }
}

async function staffAccountIsPending(uid: string) {
  return (await staffDirectoryStatus(uid)) === "pending"
}

export {
  createStaffInvitation,
  listStaffInvitations,
  previewStaffInvitation,
  redeemStaffInvitation,
  linkStaffInvitation,
  revokeStaffInvitation,
  staffAccountIsPending,
  staffDirectoryStatus,
}
export type { CreatedInvitation, InvitationView, RedeemedInvitation }
