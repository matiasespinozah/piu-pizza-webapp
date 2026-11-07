import "server-only"

import { redirect } from "next/navigation"

import { canViewSection, type AdminSection } from "@/lib/auth/permissions"
import { readStaffSession } from "@/server/auth/session"

/** Niega la sección antes de renderizar. Sin rol suficiente vuelve al inicio del panel. */
async function requireSection(section: AdminSection) {
  const session = await readStaffSession()
  if (!session) redirect("/admin/login")
  if (!canViewSection(session.role, section)) redirect("/admin")
  return session
}

export { requireSection }
