import "server-only"

import { getAuth } from "firebase-admin/auth"

import { roleLabel } from "@/lib/auth/permissions"
import type { StaffRole, StaffSession } from "@/lib/auth/roles"
import { readStaffRole } from "@/lib/auth/roles"
import { collections, staffDirectorySchema } from "@/lib/firebase/model"
import { assertStaff } from "@/server/auth/authorization"
import { UnverifiedStaffError, assignStaffRole, clearStaffRole } from "@/server/auth/claims"
import { appendAuditLog } from "@/server/dal/audit"
import { assertFirebaseDataEnabled } from "@/server/firebase/guard"
import { getAdminApp } from "@/server/firebase/admin"
import { getDb } from "@/server/firebase/firestore"

type StaffStatus = "pending" | "active" | "rejected" | "suspended"

type StaffMember = {
  uid: string
  name: string
  email: string
  role: StaffRole | null
  roleLabel: string
  status: StaffStatus
  emailVerified: boolean
}

class StaffControlError extends Error {
  readonly code: "last" | "state" | "confirm" | "missing" | "unverified"

  constructor(code: StaffControlError["code"], message: string) {
    super(message)
    this.name = "StaffControlError"
    this.code = code
  }
}

const uidPattern = /^[A-Za-z0-9]{10,128}$/

function auth() {
  return getAuth(getAdminApp())
}

function account(uid: string) {
  return getDb().collection(collections.staff).doc(uid)
}

function assertUid(uid: string) {
  if (!uidPattern.test(uid)) throw new StaffControlError("missing", "No encontramos esa cuenta.")
}

async function enabledOwnerIds() {
  const owners: string[] = []
  let pageToken: string | undefined
  do {
    const page = await auth().listUsers(200, pageToken)
    for (const user of page.users) {
      if (!user.disabled && readStaffRole(user.customClaims?.role) === "superadmin") owners.push(user.uid)
    }
    pageToken = page.pageToken
  } while (pageToken)
  return owners
}

async function assertAnOwnerRemains() {
  if ((await enabledOwnerIds()).length === 0) {
    throw new StaffControlError("last", "Tiene que quedar al menos un propietario con acceso.")
  }
}

async function readAccount(uid: string) {
  const snap = await account(uid).get()
  const parsed = staffDirectorySchema.safeParse(snap.data())
  if (!snap.exists || !parsed.success) throw new StaffControlError("missing", "No encontramos esa cuenta.")
  return parsed.data
}

async function claimTransition(uid: string, from: readonly StaffStatus[], status: StaffStatus, intendedRole: StaffRole | null) {
  await getDb().runTransaction(async (tx) => {
    const snap = await tx.get(account(uid))
    const parsed = staffDirectorySchema.safeParse(snap.data())
    if (!parsed.success || !from.includes(parsed.data.status)) {
      throw new StaffControlError("state", "Esa cuenta ya cambió. Recarga la página.")
    }
    tx.set(
      account(uid),
      staffDirectorySchema.parse({
        ...parsed.data,
        status,
        intendedRole,
        updatedAt: new Date().toISOString(),
      })
    )
  })
}

async function approveStaff(actor: StaffSession, uid: string, role: StaffRole, confirmOwner: boolean) {
  assertFirebaseDataEnabled()
  assertStaff(actor, ["superadmin"])
  assertUid(uid)
  const current = await readAccount(uid)
  if (current.status !== "pending" && current.status !== "active") {
    throw new StaffControlError("state", "Esa cuenta ya no está pendiente.")
  }
  if (role === "superadmin" && !confirmOwner) {
    throw new StaffControlError("confirm", "Confirma que esta persona también será propietaria.")
  }
  const user = await auth().getUser(uid)
  if (user.emailVerified !== true) {
    throw new StaffControlError("unverified", "Esa persona todavía tiene que verificar su correo.")
  }
  const live = readStaffRole(user.customClaims?.role)
  if (current.status === "active" && live && live !== role) {
    throw new StaffControlError("state", "Esa cuenta ya tiene otro rol. Cámbialo desde la ficha activa.")
  }
  if (current.status === "pending") await claimTransition(uid, ["pending"], "active", role)
  else await claimTransition(uid, ["active"], "active", role)
  if (live === role) {
    await auth().revokeRefreshTokens(uid)
    return
  }
  try {
    await assignStaffRole(actor, uid, role)
    if (live && live !== role) await assertAnOwnerRemains()
  } catch (error) {
    if (error instanceof UnverifiedStaffError) {
      throw new StaffControlError("unverified", error.message)
    }
    if (error instanceof StaffControlError && error.code === "last" && live) {
      await assignStaffRole(actor, uid, live)
      await claimTransition(uid, ["active"], "pending", current.intendedRole)
    }
    throw error
  }
}

async function rejectStaff(actor: StaffSession, uid: string) {
  assertFirebaseDataEnabled()
  assertStaff(actor, ["superadmin"])
  assertUid(uid)
  const current = await readAccount(uid)
  if (current.status !== "pending") throw new StaffControlError("state", "Esa cuenta ya no está pendiente.")
  await claimTransition(uid, ["pending"], "rejected", null)
  await clearStaffRole(actor, uid)
  await appendAuditLog(actor, {
    action: "staff.reject",
    targetPath: `staff/${uid}`,
    summary: "Se rechazó una solicitud de personal.",
  })
}

async function changeStaffRole(actor: StaffSession, uid: string, role: StaffRole, confirmOwner: boolean) {
  assertFirebaseDataEnabled()
  assertStaff(actor, ["superadmin"])
  assertUid(uid)
  if (role === "superadmin" && !confirmOwner) {
    throw new StaffControlError("confirm", "Confirma que esta persona también será propietaria.")
  }
  const current = await readAccount(uid)
  if (current.status !== "active") throw new StaffControlError("state", "Solo se cambia el rol de una cuenta activa.")
  const user = await auth().getUser(uid)
  if (user.emailVerified !== true) {
    throw new StaffControlError("unverified", "Esa persona todavía tiene que verificar su correo.")
  }
  const previous = readStaffRole(user.customClaims?.role)
  if (!previous) throw new StaffControlError("state", "Esta cuenta no tiene un rol activo.")
  if (previous === role) {
    await claimTransition(uid, ["active"], "active", role)
    return
  }
  await assignStaffRole(actor, uid, role)
  await claimTransition(uid, ["active"], "active", role)
  try {
    await assertAnOwnerRemains()
  } catch (error) {
    await assignStaffRole(actor, uid, previous)
    await claimTransition(uid, ["active"], "active", previous)
    throw error
  }
}

async function suspendStaff(actor: StaffSession, uid: string) {
  assertFirebaseDataEnabled()
  assertStaff(actor, ["superadmin"])
  assertUid(uid)
  const current = await readAccount(uid)
  if (current.status !== "active") throw new StaffControlError("state", "Solo se puede suspender una cuenta activa.")
  const user = await auth().getUser(uid)
  await auth().revokeRefreshTokens(uid)
  await auth().updateUser(uid, { disabled: true })
  try {
    await claimTransition(uid, ["active"], "suspended", readStaffRole(user.customClaims?.role))
  } catch (error) {
    await auth().updateUser(uid, { disabled: user.disabled })
    throw error
  }
  try {
    await assertAnOwnerRemains()
  } catch (error) {
    await auth().updateUser(uid, { disabled: user.disabled })
    await claimTransition(uid, ["suspended"], "active", current.intendedRole)
    throw error
  }
  await appendAuditLog(actor, {
    action: "staff.suspend",
    targetPath: `staff/${uid}`,
    summary: "Se suspendió el acceso de personal.",
  })
}

async function reactivateStaff(actor: StaffSession, uid: string) {
  assertFirebaseDataEnabled()
  assertStaff(actor, ["superadmin"])
  assertUid(uid)
  const current = await readAccount(uid)
  if (current.status !== "suspended") throw new StaffControlError("state", "Esa cuenta no está suspendida.")
  const user = await auth().getUser(uid)
  if (!readStaffRole(user.customClaims?.role)) {
    throw new StaffControlError("state", "Esta cuenta ya no tiene rol. Hay que invitarla de nuevo.")
  }
  if (user.emailVerified !== true) {
    throw new StaffControlError("unverified", "Esa persona todavía tiene que verificar su correo.")
  }
  await auth().revokeRefreshTokens(uid)
  await auth().updateUser(uid, { disabled: false })
  await claimTransition(uid, ["suspended"], "active", readStaffRole(user.customClaims?.role))
  await appendAuditLog(actor, {
    action: "staff.reactivate",
    targetPath: `staff/${uid}`,
    summary: "Se reactivó el acceso de personal.",
  })
}

async function revokeStaffAccess(actor: StaffSession, uid: string) {
  assertFirebaseDataEnabled()
  assertStaff(actor, ["superadmin"])
  assertUid(uid)
  const current = await readAccount(uid)
  if (current.status === "pending") throw new StaffControlError("state", "Una solicitud pendiente se rechaza, no se revoca.")
  const user = await auth().getUser(uid)
  const previous = readStaffRole(user.customClaims?.role)
  if (current.status === "rejected" && !previous) {
    await auth().revokeRefreshTokens(uid)
    return
  }
  if (current.status !== "active" && current.status !== "suspended" && current.status !== "rejected") {
    throw new StaffControlError("state", "Esa cuenta ya no tiene acceso.")
  }
  await clearStaffRole(actor, uid)
  if (user.disabled) await auth().updateUser(uid, { disabled: false })
  if (current.status !== "rejected") await claimTransition(uid, ["active", "suspended"], "rejected", null)
  try {
    await assertAnOwnerRemains()
  } catch (error) {
    if (previous) await assignStaffRole(actor, uid, previous)
    if (user.disabled) await auth().updateUser(uid, { disabled: true })
    if (current.status !== "rejected") await claimTransition(uid, ["rejected"], current.status, current.intendedRole)
    throw error
  }
  await appendAuditLog(actor, {
    action: "staff.access.revoke",
    targetPath: `staff/${uid}`,
    summary: "Se revocó el acceso administrativo.",
  })
}

async function listStaffMembers(actor: StaffSession): Promise<StaffMember[]> {
  assertFirebaseDataEnabled()
  assertStaff(actor, ["superadmin"])
  const snap = await getDb().collection(collections.staff).orderBy("createdAt", "desc").limit(40).get()
  if (snap.empty) return []
  const found = await auth().getUsers(snap.docs.map((doc) => ({ uid: doc.id })))
  const byUid = new Map(found.users.map((user) => [user.uid, user]))
  const members: StaffMember[] = []
  for (const doc of snap.docs) {
    const parsed = staffDirectorySchema.safeParse(doc.data())
    if (!parsed.success) continue
    const user = byUid.get(doc.id)
    const role = readStaffRole(user?.customClaims?.role)
    const name = parsed.data.displayName || user?.displayName || ""
    members.push({
      uid: doc.id,
      name,
      email: parsed.data.email || user?.email || "",
      role,
      roleLabel: role ? roleLabel(role) : "Sin rol",
      status: parsed.data.status,
      emailVerified: user?.emailVerified === true,
    })
  }
  return members
}

export {
  StaffControlError,
  approveStaff,
  changeStaffRole,
  listStaffMembers,
  reactivateStaff,
  rejectStaff,
  revokeStaffAccess,
  suspendStaff,
}
export type { StaffMember, StaffStatus }
