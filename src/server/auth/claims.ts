import "server-only"

import { getAuth } from "firebase-admin/auth"

import type { StaffRole, StaffSession } from "@/lib/auth/roles"
import { assertStaff } from "@/server/auth/authorization"
import { appendAuditLog } from "@/server/dal/audit"
import { getAdminApp } from "@/server/firebase/admin"
import { assertFirebaseDataEnabled } from "@/server/firebase/guard"

const uidPattern = /^[A-Za-z0-9]{10,128}$/

class UnverifiedStaffError extends Error {
  readonly code = "unverified"

  constructor() {
    super("Esa persona todavía tiene que verificar su correo.")
    this.name = "UnverifiedStaffError"
  }
}

/**
 * Primero revoca las sesiones, después escribe el claim y vuelve a revocar.
 * La segunda revocación invalida un ingreso que haya ocurrido en ese instante con el rol anterior.
 * Si el proceso se corta, la cookie vieja ya no sirve y el propietario puede reintentar.
 * Un rol nuevo exige correo verificado.
 */
async function setStaffClaim(actor: StaffSession, targetUid: string, role: StaffRole | null, summary: string) {
  assertFirebaseDataEnabled()
  assertStaff(actor, ["superadmin"])
  if (!uidPattern.test(targetUid)) throw new Error("El identificador de la cuenta no es válido.")

  const auth = getAuth(getAdminApp())
  const user = await auth.getUser(targetUid)
  if (role && user.emailVerified !== true) throw new UnverifiedStaffError()

  const claims = { ...user.customClaims }
  if (role) claims.role = role
  else delete claims.role

  await auth.revokeRefreshTokens(targetUid)
  await auth.setCustomUserClaims(targetUid, claims)
  await auth.revokeRefreshTokens(targetUid)
  await appendAuditLog(actor, {
    action: role ? "staff.role.assign" : "staff.role.clear",
    targetPath: `staff/${targetUid}`,
    summary,
  })
}

async function assignStaffRole(actor: StaffSession, targetUid: string, role: StaffRole) {
  await setStaffClaim(actor, targetUid, role, `Rol asignado: ${role}.`)
}

async function clearStaffRole(actor: StaffSession, targetUid: string) {
  await setStaffClaim(actor, targetUid, null, "Se quitó el rol de personal.")
}

export { UnverifiedStaffError, assignStaffRole, clearStaffRole }
