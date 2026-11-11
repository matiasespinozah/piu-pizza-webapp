import "server-only"

import type { StaffRole, StaffSession } from "@/lib/auth/roles"
import { roleAllows } from "@/lib/auth/roles"

class StaffAccessError extends Error {
  readonly code: "forbidden" | "pending"
  readonly emailVerified: boolean | null

  constructor(code: "forbidden" | "pending" = "forbidden", emailVerified: boolean | null = null) {
    super("No autorizado.")
    this.name = "StaffAccessError"
    this.code = code
    this.emailVerified = emailVerified
  }
}

function assertStaff(session: StaffSession | null, allowed: readonly StaffRole[]): StaffSession {
  if (!session || !roleAllows(session.role, allowed)) {
    throw new StaffAccessError()
  }
  return session
}

export { assertStaff, StaffAccessError }
