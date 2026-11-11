import "server-only"

import { getAuth } from "firebase-admin/auth"

import { readStaffRole, type StaffSession } from "@/lib/auth/roles"
import type { VerifiedStaffToken } from "@/lib/auth/staff-session"
import { getAdminApp } from "@/server/firebase/admin"
import { staffDirectoryStatus } from "@/server/staff/invitations"

/**
 * La cookie prueba quién entró. El permiso sale de Authentication en este momento:
 * `disabled` y el claim `role` vigente. Firebase revoca por segundos, así que una
 * cookie del mismo segundo puede seguir verificándose con el rol viejo.
 * Una ficha pendiente, suspendida o rechazada bloquea aunque ese claim exista.
 * Sin ficha, el claim vigente alcanza: el primer propietario no tiene documento `staff`.
 */
async function liveStaffSession(token: VerifiedStaffToken): Promise<StaffSession | null> {
  if (typeof token.uid !== "string" || token.uid.length === 0) return null
  try {
    const user = await getAuth(getAdminApp()).getUser(token.uid)
    if (user.disabled) return null
    const role = readStaffRole(user.customClaims?.role)
    if (!role) return null
    const directory = await staffDirectoryStatus(token.uid)
    if (directory === "pending" || directory === "suspended" || directory === "rejected" || directory === "unavailable") {
      return null
    }
    return {
      uid: user.uid,
      role,
      email: user.email || (typeof token.email === "string" ? token.email : ""),
      displayName: user.displayName || (typeof token.name === "string" ? token.name : ""),
    }
  } catch {
    return null
  }
}

export { liveStaffSession }
