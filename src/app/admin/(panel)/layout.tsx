import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { AdminFrame } from "@/components/features/admin/admin-frame"
import { roleLabel } from "@/lib/auth/permissions"
import { readStaffSession } from "@/server/auth/session"

// Sin shell estático: la cookie se lee antes de enviar HTML.
export const instant = false

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const session = await readStaffSession()
  if (!session) redirect("/admin/login")

  return (
    <AdminFrame
      email={session.email}
      displayName={session.displayName}
      role={session.role}
      roleLabel={roleLabel(session.role)}
    >
      {children}
    </AdminFrame>
  )
}
