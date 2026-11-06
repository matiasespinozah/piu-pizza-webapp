import "server-only"

import { getAuth } from "firebase-admin/auth"

import type { StaffRole, StaffSession } from "@/lib/auth/roles"
import { assertStaff } from "@/server/auth/authorization"
import { appendAuditLog } from "@/server/dal/audit"
import { getAdminApp } from "@/server/firebase/admin"
import { assertFirebaseDataEnabled } from "@/server/firebase/guard"

/**
 * Cambia el rol de otra cuenta. Solo un SUPERADMIN, y solo desde el servidor.
 * El claim reemplaza los claims anteriores y revoca las sesiones viejas.
 * El primer SUPERADMIN no pasa por aquí: lo asigna scripts/bootstrap-superadmin.mjs.
 */
async function assignStaffRole(actor: StaffSession, targetUid: string, role: StaffRole) {
  assertFirebaseDataEnabled()
  assertStaff(actor, ["superadmin"])
  if (!/^[A-Za-z0-9]{10,128}$/.test(targetUid)) {
    throw new Error("El identificador de la cuenta no es válido.")
  }

  const auth = getAuth(getAdminApp())
  await auth.setCustomUserClaims(targetUid, { role })
  await auth.revokeRefreshTokens(targetUid)
  await appendAuditLog(actor, {
    action: "staff.role.assign",
    targetPath: `staff/${targetUid}`,
    summary: `Rol asignado: ${role}.`,
  })
}

export { assignStaffRole }
