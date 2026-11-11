import { getAuth } from "firebase-admin/auth"
import test from "node:test"
import assert from "node:assert/strict"

import { decideStaffSession } from "@/lib/auth/staff-session"
import { collections } from "@/lib/firebase/model"
import { sessionMaxAgeMs } from "@/lib/auth/session-policy"
import { StaffAccessError } from "@/server/auth/authorization"
import { liveStaffSession } from "@/server/auth/live-session"
import { getAdminApp } from "@/server/firebase/admin"
import { getDb } from "@/server/firebase/firestore"
import { StaffControlError, approveStaff, changeStaffRole, rejectStaff, revokeStaffAccess, suspendStaff, reactivateStaff } from "@/server/staff/access"
import { createStaffInvitation, redeemStaffInvitation } from "@/server/staff/invitations"

assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "Firestore tiene que ser el emulador.")
assert.ok(process.env.FIREBASE_AUTH_EMULATOR_HOST, "Auth tiene que ser el emulador.")
assert.equal(process.env.GCLOUD_PROJECT, "demo-piu-pizza")
assert.notEqual(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, "piu-pizza-cl")

const auth = getAuth(getAdminApp())
const password = "EmulatorOnly-1"
const stamp = Date.now()
let serial = 0
const adminActor = { uid: "adminactor01", role: "admin", email: "ana@example.test", displayName: "Ana" }

function email(name) {
  serial += 1
  return `${name}-${stamp}-${serial}@example.test`
}

async function signIn(account) {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST
  const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: account, password, returnSecureToken: true }),
  })
  const body = await response.json()
  return { ok: response.ok, body }
}

async function ownerSession() {
  const account = email("propietario")
  const user = await auth.createUser({ email: account, password, displayName: "Felipe", emailVerified: true })
  await auth.setCustomUserClaims(user.uid, { role: "superadmin" })
  const now = new Date().toISOString()
  await getDb().collection(collections.staff).doc(user.uid).set({
    email: account,
    displayName: "Felipe",
    status: "active",
    intendedRole: "superadmin",
    invitedBy: null,
    createdAt: now,
    updatedAt: now,
  })
  return { uid: user.uid, role: "superadmin", email: account, displayName: "Felipe" }
}

async function pendingWorker(owner, name, verified = true) {
  const account = email(name)
  const created = await createStaffInvitation(owner, account)
  await redeemStaffInvitation({ token: created.token, name: "Nora Soto", email: account, password, address: name })
  const user = await auth.getUserByEmail(account)
  if (verified) await auth.updateUser(user.uid, { emailVerified: true })
  return { account, uid: user.uid }
}

test("un admin no aprueba y el alta sigue sin rol hasta que el propietario la acepta", async () => {
  const owner = await ownerSession()
  const worker = await pendingWorker(owner, "flujo")
  await assert.rejects(() => approveStaff(adminActor, worker.uid, "admin", false), StaffAccessError)
  assert.equal((await auth.getUser(worker.uid)).customClaims?.role, undefined)

  await approveStaff(owner, worker.uid, "admin", false)
  const signed = await signIn(worker.account)
  assert.equal(signed.ok, true)
  const decoded = await auth.verifyIdToken(signed.body.idToken, true)
  const decision = decideStaffSession(decoded)
  assert.equal(decision.ok && decision.session.role, "admin")
  const cookie = await auth.createSessionCookie(signed.body.idToken, { expiresIn: sessionMaxAgeMs })

  await assert.rejects(
    () => changeStaffRole(owner, worker.uid, "superadmin", false),
    (error) => error instanceof StaffControlError && error.code === "confirm"
  )
  await new Promise((resolve) => setTimeout(resolve, 1100))
  await changeStaffRole(owner, worker.uid, "superadmin", true)
  await assert.rejects(() => auth.verifySessionCookie(cookie, true))
  const promoted = await signIn(worker.account)
  const promotedToken = await auth.verifyIdToken(promoted.body.idToken, true)
  assert.equal(decideStaffSession(promotedToken).ok && decideStaffSession(promotedToken).session.role, "superadmin")
  const freshCookie = await auth.createSessionCookie(promoted.body.idToken, { expiresIn: sessionMaxAgeMs })

  await new Promise((resolve) => setTimeout(resolve, 1100))
  await suspendStaff(owner, worker.uid)
  const blocked = await signIn(worker.account)
  assert.equal(blocked.ok, false)
  assert.match(String(blocked.body?.error?.message), /USER_DISABLED/)
  await assert.rejects(() => auth.verifySessionCookie(cookie, true))
  await assert.rejects(() => auth.verifySessionCookie(freshCookie, true))

  await reactivateStaff(owner, worker.uid)
  const restored = await signIn(worker.account)
  assert.equal(restored.ok, true)
  assert.equal((await auth.getUser(worker.uid)).customClaims.role, "superadmin")

  await revokeStaffAccess(owner, worker.uid)
  const revoked = await signIn(worker.account)
  assert.equal(revoked.ok, true)
  assert.equal(decideStaffSession(await auth.verifyIdToken(revoked.body.idToken, true)).ok, false)
  const logs = await getDb().collection(collections.auditLogs).where("targetPath", "==", `staff/${worker.uid}`).limit(10).get()
  assert.equal(logs.docs.some((doc) => doc.get("action") === "staff.suspend"), true)
  assert.equal(logs.docs.some((doc) => String(doc.get("summary")).includes(password)), false)
})

test("no se puede dejar el panel sin propietario y una solicitud se puede rechazar", async () => {
  const owner = await ownerSession()
  let pageToken
  do {
    const page = await auth.listUsers(200, pageToken)
    for (const user of page.users) {
      if (user.uid !== owner.uid && !user.disabled && user.customClaims?.role === "superadmin") {
        await auth.setCustomUserClaims(user.uid, { ...user.customClaims, role: "admin" })
      }
    }
    pageToken = page.pageToken
  } while (pageToken)

  await assert.rejects(() => suspendStaff(owner, owner.uid), (error) => error instanceof StaffControlError && error.code === "last")
  await assert.rejects(() => changeStaffRole(owner, owner.uid, "admin", false), (error) => error instanceof StaffControlError && error.code === "last")
  const still = await auth.getUser(owner.uid)
  assert.equal(still.disabled, false)
  assert.equal(still.customClaims.role, "superadmin")

  const worker = await pendingWorker(owner, "rechazo")
  await rejectStaff(owner, worker.uid)
  const rejected = await signIn(worker.account)
  assert.equal(rejected.ok, true)
  assert.equal(decideStaffSession(await auth.verifyIdToken(rejected.body.idToken, true)).ok, false)
  await assert.rejects(() => approveStaff(owner, worker.uid, "superadmin", true), (error) => error instanceof StaffControlError && error.code === "state")
  await assert.rejects(() => changeStaffRole(owner, owner.uid, "admin", true), (error) => error instanceof StaffControlError && error.code === "last")
})

test("dos aprobaciones simultáneas dejan un solo rol", async () => {
  const owner = await ownerSession()
  const worker = await pendingWorker(owner, "carrera-rol")
  const results = await Promise.allSettled([
    approveStaff(owner, worker.uid, "admin", false),
    approveStaff(owner, worker.uid, "admin", false),
  ])
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1)
  assert.equal((await auth.getUser(worker.uid)).customClaims.role, "admin")
  assert.equal((await getDb().collection(collections.staff).doc(worker.uid).get()).get("status"), "active")
})

test("sin correo verificado no hay rol y una aprobación incompleta se puede repetir", async () => {
  const owner = await ownerSession()
  const unverified = await pendingWorker(owner, "sin-verificar", false)
  await assert.rejects(
    () => approveStaff(owner, unverified.uid, "admin", false),
    (error) => error instanceof StaffControlError && error.code === "unverified"
  )
  assert.equal((await auth.getUser(unverified.uid)).customClaims?.role, undefined)
  assert.equal((await getDb().collection(collections.staff).doc(unverified.uid).get()).get("status"), "pending")

  const partial = await pendingWorker(owner, "a-medias", true)
  await getDb().collection(collections.staff).doc(partial.uid).update({
    status: "active",
    intendedRole: "admin",
    updatedAt: new Date().toISOString(),
  })
  await approveStaff(owner, partial.uid, "admin", false)
  assert.equal((await auth.getUser(partial.uid)).customClaims.role, "admin")
  await approveStaff(owner, partial.uid, "admin", false)
  assert.equal((await auth.getUser(partial.uid)).customClaims.role, "admin")
  assert.equal((await getDb().collection(collections.staff).doc(partial.uid).get()).get("status"), "active")

  const claimed = await pendingWorker(owner, "claim-primero", true)
  await auth.setCustomUserClaims(claimed.uid, { role: "admin" })
  await approveStaff(owner, claimed.uid, "admin", false)
  assert.equal((await getDb().collection(collections.staff).doc(claimed.uid).get()).get("status"), "active")
  assert.equal((await auth.getUser(claimed.uid)).customClaims.role, "admin")
})

test("revocar corta la sesión anterior y repetir la revocación no devuelve el rol", async () => {
  const owner = await ownerSession()
  const worker = await pendingWorker(owner, "revocacion")
  await approveStaff(owner, worker.uid, "admin", false)
  const signed = await signIn(worker.account)
  const cookie = await auth.createSessionCookie(signed.body.idToken, { expiresIn: sessionMaxAgeMs })
  await new Promise((resolve) => setTimeout(resolve, 1100))
  await auth.setCustomUserClaims(worker.uid, {})
  await revokeStaffAccess(owner, worker.uid)
  await assert.rejects(() => auth.verifySessionCookie(cookie, true))
  await revokeStaffAccess(owner, worker.uid)
  assert.equal((await auth.getUser(worker.uid)).customClaims?.role, undefined)
  assert.equal((await getDb().collection(collections.staff).doc(worker.uid).get()).get("status"), "rejected")
})

test("una cookie recién emitida pierde el permiso en el mismo instante y una ficha inconsistente se puede corregir", async () => {
  const owner = await ownerSession()
  const worker = await pendingWorker(owner, "inmediato")
  await approveStaff(owner, worker.uid, "superadmin", true)
  const signed = await signIn(worker.account)
  const cookie = await auth.createSessionCookie(signed.body.idToken, { expiresIn: sessionMaxAgeMs })
  const decoded = await auth.verifySessionCookie(cookie, true)
  assert.equal((await liveStaffSession(decoded)).role, "superadmin")

  await changeStaffRole(owner, worker.uid, "admin", false)
  const reduced = await liveStaffSession({ ...decoded, role: "superadmin" })
  assert.equal(reduced?.role, "admin")
  await assert.rejects(() => approveStaff(reduced, worker.uid, "admin", false), StaffAccessError)

  await suspendStaff(owner, worker.uid)
  assert.equal(await liveStaffSession(decoded), null)
  await reactivateStaff(owner, worker.uid)
  assert.equal((await liveStaffSession(decoded)).role, "admin")

  await revokeStaffAccess(owner, worker.uid)
  assert.equal(await liveStaffSession(decoded), null)

  const orphan = email("sin-ficha")
  const bare = await auth.createUser({ email: orphan, password, emailVerified: true, displayName: "Dueño" })
  await auth.setCustomUserClaims(bare.uid, { role: "superadmin" })
  assert.equal((await liveStaffSession({ uid: bare.uid, role: "admin" })).role, "superadmin")

  const inconsistent = await pendingWorker(owner, "inconsistente")
  await auth.setCustomUserClaims(inconsistent.uid, { role: "admin" })
  assert.equal(await liveStaffSession({ uid: inconsistent.uid, role: "admin" }), null)
  await approveStaff(owner, inconsistent.uid, "superadmin", true)
  assert.equal((await auth.getUser(inconsistent.uid)).customClaims.role, "superadmin")
  assert.equal((await getDb().collection(collections.staff).doc(inconsistent.uid).get()).get("status"), "active")
  assert.equal((await liveStaffSession({ uid: inconsistent.uid, role: "admin" })).role, "superadmin")

  const stray = await pendingWorker(owner, "suelto")
  await auth.setCustomUserClaims(stray.uid, { role: "superadmin" })
  await rejectStaff(owner, stray.uid)
  assert.equal((await auth.getUser(stray.uid)).customClaims?.role, undefined)
  assert.equal(await liveStaffSession({ uid: stray.uid, role: "superadmin" }), null)
})
