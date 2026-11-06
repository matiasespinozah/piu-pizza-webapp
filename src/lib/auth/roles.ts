import { z } from "zod"

/** Rol de personal. Vive en un custom claim, nunca en un campo que el navegador pueda editar. */
const staffRoleSchema = z.enum(["superadmin", "admin"])

type StaffRole = z.infer<typeof staffRoleSchema>

type StaffSession = {
  uid: string
  role: StaffRole
}

function readStaffRole(value: unknown): StaffRole | null {
  const parsed = staffRoleSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

function roleAllows(role: StaffRole, allowed: readonly StaffRole[]) {
  return allowed.includes(role)
}

export { readStaffRole, roleAllows, staffRoleSchema }
export type { StaffRole, StaffSession }
