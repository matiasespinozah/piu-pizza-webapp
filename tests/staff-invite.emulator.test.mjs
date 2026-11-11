import { getAuth } from "firebase-admin/auth"
import test from "node:test"
import assert from "node:assert/strict"

import { decideStaffSession } from "@/lib/auth/staff-session"
import { collections } from "@/lib/firebase/model"
import { hashInviteToken } from "@/lib/staff/invitation"
import { getAdminApp } from "@/server/firebase/admin"
import { getDb } from "@/server/firebase/firestore"
import {
  createStaffInvitation,
  previewStaffInvitation,
  redeemStaffInvitation,
  linkStaffInvitation,
  revokeStaffInvitation,
  staffAccountIsPending,
} from "@/server/staff/invitations"

assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "Firestore tiene que ser el emulador.")
assert.ok(process.env.FIREBASE_AUTH_EMULATOR_HOST, "Auth tiene que ser el emulador.")
assert.equal(process.env.GCLOUD_PROJECT, "demo-piu-pizza")
assert.notEqual(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, "piu-pizza-cl")

const auth = getAuth(getAdminApp())
const owner = { uid: "ownerinvite1", role: "superadmin", email: "felipe@example.test", displayName: "Felipe" }
const password = "EmulatorOnly-1"
const stamp = Date.now()

function email(name) {
  return `${name}-${stamp}@example.test`
}

async function signIn(account, secret = password) {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST
  const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: account, password: secret, returnSecureToken: true }),
  })
  const body = await response.json()
  return { ok: response.ok, body }
}

async function redeem(token, account, name = "Ana Pérez") {
  return redeemStaffInvitation({ token, name, email: account, password, address: `test-${account}` })
}

test("el registro queda pendiente, sin rol, y el secreto no se guarda", async () => {
  const account = email("alta")
  const created = await createStaffInvitation(owner, account)
  const preview = await previewStaffInvitation(created.token, "preview-alta")
  assert.equal(preview.email, account)

  const result = await redeem(created.token, account)
  assert.equal(result.emailVerified, false)

  const user = await auth.getUserByEmail(account)
  assert.equal(user.customClaims?.role, undefined)
  assert.equal(await staffAccountIsPending(user.uid), true)
  const signed = await signIn(account)
  assert.equal(signed.ok, true)
  const decision = decideStaffSession(await auth.verifyIdToken(signed.body.idToken, true))
  assert.deepEqual(decision, { ok: false, reason: "forbidden" })

  const stored = await getDb().collection(collections.invitations).doc(hashInviteToken(created.token)).get()
  assert.equal(stored.get("status"), "used")
  assert.equal(JSON.stringify(stored.data()).includes(created.token), false)
  const staff = await getDb().collection(collections.staff).doc(user.uid).get()
  assert.equal(staff.get("status"), "pending")
  const logs = await getDb().collection(collections.auditLogs).where("targetPath", "==", `staff/${user.uid}`).limit(5).get()
  assert.equal(logs.docs.some((doc) => String(doc.get("summary")).includes(created.token)), false)
})

test("una invitación vencida no crea la cuenta", async () => {
  const account = email("vence")
  const created = await createStaffInvitation(owner, account)
  await assert.rejects(
    () => redeemStaffInvitation({ token: created.token, name: "Ana", email: account, password, address: "vence", now: Date.parse(created.expiresAt) + 1000 }),
    (error) => error.code === "expired"
  )
  await assert.rejects(() => auth.getUserByEmail(account))
})

test("una invitación no se puede usar dos veces", async () => {
  const account = email("dos")
  const created = await createStaffInvitation(owner, account)
  await redeem(created.token, account)
  await assert.rejects(() => redeem(created.token, account), (error) => error.code === "used")
  const listed = await auth.listUsers(1000)
  assert.equal(listed.users.filter((user) => user.email === account).length, 1)
})

test("dos registros simultáneos dejan una sola cuenta", async () => {
  const account = email("carrera")
  const created = await createStaffInvitation(owner, account)
  const results = await Promise.allSettled([redeem(created.token, account, "Ana Uno"), redeem(created.token, account, "Ana Dos")])
  const fulfilled = results.filter((result) => result.status === "fulfilled")
  assert.equal(fulfilled.length, 1)
  const listed = await auth.listUsers(1000)
  assert.equal(listed.users.filter((user) => user.email === account).length, 1)
})

test("un correo que ya existe conserva su contraseña y solo el titular vincula la invitación", async () => {
  const orphan = email("huerfano")
  await auth.createUser({ email: orphan, password: "OldPassword-1", emailVerified: true, displayName: "Viejo" })
  const created = await createStaffInvitation(owner, orphan)
  const preview = await previewStaffInvitation(created.token, "preview")
  assert.equal(preview.accountExists, true)
  await assert.rejects(() => redeem(created.token, orphan, "Nora"), (error) => error.code === "sign-in")
  assert.equal((await signIn(orphan, "EmulatorOnly-1")).ok, false)
  assert.equal((await auth.getUserByEmail(orphan)).displayName, "Viejo")

  const intruder = email("intruso")
  await auth.createUser({ email: intruder, password: "OldPassword-1", emailVerified: true })
  const intruderSign = await signIn(intruder, "OldPassword-1")
  await assert.rejects(
    () => linkStaffInvitation({ token: created.token, idToken: intruderSign.body.idToken, name: "Intruso", address: "intruso" }),
    (error) => error.code === "mismatch"
  )
  assert.equal((await getDb().collection(collections.invitations).doc(hashInviteToken(created.token)).get()).get("status"), "open")

  const ownerSign = await signIn(orphan, "OldPassword-1")
  const linked = await linkStaffInvitation({ token: created.token, idToken: ownerSign.body.idToken, name: "Nora", address: "titular" })
  assert.equal(linked.emailVerified, true)
  const user = await auth.getUserByEmail(orphan)
  assert.equal(user.displayName, "Viejo")
  assert.equal(user.customClaims?.role, undefined)
  assert.equal((await getDb().collection(collections.staff).doc(user.uid).get()).get("status"), "pending")
  assert.equal((await signIn(orphan, "OldPassword-1")).ok, true)
  await assert.rejects(
    () => linkStaffInvitation({ token: created.token, idToken: ownerSign.body.idToken, name: "Nora", address: "otra" }),
    (error) => error.code === "used"
  )

  const ownerAccount = email("propietario")
  const existing = await auth.createUser({ email: ownerAccount, password })
  await auth.setCustomUserClaims(existing.uid, { role: "superadmin" })
  await assert.rejects(() => createStaffInvitation(owner, ownerAccount), (error) => error.code === "exists")
  assert.equal((await auth.getUser(existing.uid)).customClaims.role, "superadmin")
})

test("revocar una invitación abierta impide el registro", async () => {
  const account = email("revocada")
  const created = await createStaffInvitation(owner, account)
  const id = hashInviteToken(created.token)
  await revokeStaffInvitation(owner, id)
  await assert.rejects(() => redeem(created.token, account), (error) => error.code === "revoked")
  await assert.rejects(() => auth.getUserByEmail(account))
})
