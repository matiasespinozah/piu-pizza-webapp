import { readStaffRole, type StaffSession } from "@/lib/auth/roles"
import { authTimeIsFresh } from "@/lib/auth/session-policy"

type VerifiedStaffToken = {
  uid?: string
  email?: unknown
  name?: unknown
  role?: unknown
  auth_time?: unknown
}

type StaffDecision =
  | { ok: true; session: StaffSession }
  | { ok: false; reason: "stale" | "forbidden" }

/**
 * Decide con el token ya verificado por el Admin SDK.
 * El uid y el rol salen de ese token, nunca de un campo del formulario.
 */
function staffFromVerified(token: VerifiedStaffToken): StaffSession | null {
  const role = readStaffRole(token.role)
  if (!role || typeof token.uid !== "string" || token.uid.length === 0) return null
  return {
    uid: token.uid,
    role,
    email: typeof token.email === "string" ? token.email : "",
    displayName: typeof token.name === "string" ? token.name : "",
  }
}

function decideStaffSession(token: VerifiedStaffToken, nowMs = Date.now()): StaffDecision {
  if (!authTimeIsFresh(token.auth_time, nowMs)) return { ok: false, reason: "stale" }
  const session = staffFromVerified(token)
  if (!session) return { ok: false, reason: "forbidden" }
  return { ok: true, session }
}

export { decideStaffSession, staffFromVerified }
export type { StaffDecision, VerifiedStaffToken }
