import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { AdminFrame } from "@/components/features/admin/admin-frame"
import { ServiceFrame } from "@/components/features/service/service-frame"
import { roleLabel } from "@/lib/auth/permissions"
import { readStaffSession } from "@/server/auth/session"

// Sin shell estático: la cookie se lee antes de enviar HTML.
export const instant = false

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const session = await readStaffSession()
  if (!session) redirect("/admin/login")

  if (session.role === "mesero") {
    return (
      <ServiceFrame who={session.displayName || session.email} email={session.email} roleLabel={roleLabel(session.role)}>
        {children}
      </ServiceFrame>
    )
  }

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
