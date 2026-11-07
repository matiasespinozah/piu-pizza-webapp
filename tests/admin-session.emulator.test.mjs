import { initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import test from "node:test"
import assert from "node:assert/strict"

import { canViewSection } from "../src/lib/auth/permissions.ts"
import { sessionMaxAgeMs } from "../src/lib/auth/session-policy.ts"
import { decideStaffSession, staffFromVerified } from "../src/lib/auth/staff-session.ts"

const projectId = "demo-piu-pizza"
const app = initializeApp({ projectId }, "admin-session-test")
const auth = getAuth(app)
const password = "EmulatorOnly-1"
const stamp = Date.now()

function email(name) {
  return `${name}-${stamp}@example.test`
}

async function signIn(account) {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST
  assert.ok(host, "FIREBASE_AUTH_EMULATOR_HOST no está definido")
  const response = await fetch(
    `http://${host}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: account, password, returnSecureToken: true }),
    }
  )
  const body = await response.json()
  return { ok: response.ok, body }
}

async function tokenFor(account) {
  const result = await signIn(account)
  assert.equal(result.ok, true, result.body?.error?.message)
  return result.body.idToken
}

test("sin custom claim no se autoriza la sesión", async () => {
  const account = email("sin-rol")
  await auth.createUser({ email: account, password })
  const decoded = await auth.verifyIdToken(await tokenFor(account), true)
  assert.deepEqual(decideStaffSession(decoded), { ok: false, reason: "forbidden" })
})

test("admin y superadmin se leen del token verificado", async () => {
  const adminAccount = email("admin")
  const ownerAccount = email("owner")
  const adminUser = await auth.createUser({ email: adminAccount, password, displayName: "Ana" })
  const ownerUser = await auth.createUser({ email: ownerAccount, password, displayName: "Felipe" })
  await auth.setCustomUserClaims(adminUser.uid, { role: "admin", locale: "es-CL" })
  await auth.setCustomUserClaims(ownerUser.uid, { role: "superadmin" })

  const adminToken = await auth.verifyIdToken(await tokenFor(adminAccount), true)
  const ownerToken = await auth.verifyIdToken(await tokenFor(ownerAccount), true)
  const adminDecision = decideStaffSession(adminToken)
  const ownerDecision = decideStaffSession(ownerToken)

  assert.equal(adminDecision.ok && adminDecision.session.role, "admin")
  assert.equal(adminDecision.ok && adminDecision.session.email, adminAccount)
  assert.equal(canViewSection("admin", "personal"), false)
  assert.equal(ownerDecision.ok && ownerDecision.session.role, "superadmin")
  assert.equal(canViewSection("superadmin", "personal"), true)
  assert.equal(adminToken.locale, "es-CL")
})

test("una cookie alterada o revocada no verifica", async () => {
  const account = email("sesion")
  const user = await auth.createUser({ email: account, password })
  await auth.setCustomUserClaims(user.uid, { role: "admin" })
  const idToken = await tokenFor(account)
  const cookie = await auth.createSessionCookie(idToken, { expiresIn: sessionMaxAgeMs })
  const decoded = await auth.verifySessionCookie(cookie, true)
  assert.equal(staffFromVerified(decoded)?.role, "admin")

  await assert.rejects(() => auth.verifySessionCookie(`${cookie}x`, true))
  // La revocación compara segundos. Si cae en el mismo segundo del ingreso, la cookie sigue válida.
  await new Promise((resolve) => setTimeout(resolve, 1100))
  await auth.revokeRefreshTokens(user.uid)
  await assert.rejects(() => auth.verifySessionCookie(cookie, true))
})

test("una cuenta deshabilitada no obtiene token", async () => {
  const account = email("apagada")
  const user = await auth.createUser({ email: account, password })
  await auth.updateUser(user.uid, { disabled: true })
  const result = await signIn(account)
  assert.equal(result.ok, false)
  assert.match(String(result.body?.error?.message), /USER_DISABLED/)
})

test("Firebase rechaza una cookie más corta que cinco minutos", async () => {
  const account = email("corta")
  const user = await auth.createUser({ email: account, password })
  await auth.setCustomUserClaims(user.uid, { role: "admin" })
  const idToken = await tokenFor(account)
  await assert.rejects(() => auth.createSessionCookie(idToken, { expiresIn: 1000 }))
})

test.after(async () => {
  const listed = await auth.listUsers(100)
  await Promise.all(
    listed.users.filter((user) => user.email?.endsWith(`-${stamp}@example.test`)).map((user) => auth.deleteUser(user.uid))
  )
})
