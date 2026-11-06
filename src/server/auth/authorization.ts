import "server-only"

import type { StaffRole, StaffSession } from "@/lib/auth/roles"
import { roleAllows } from "@/lib/auth/roles"

class StaffAccessError extends Error {
  constructor() {
    super("No autorizado.")
    this.name = "StaffAccessError"
  }
}

function assertStaff(session: StaffSession | null, allowed: readonly StaffRole[]): StaffSession {
  if (!session || !roleAllows(session.role, allowed)) {
    throw new StaffAccessError()
  }
  return session
}

export { assertStaff, StaffAccessError }
