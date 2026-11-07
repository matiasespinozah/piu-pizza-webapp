import type { Metadata } from "next"

import { AdminSoon } from "@/components/features/admin/admin-soon"
import { requireSection } from "@/server/auth/access"

export const instant = false

export const metadata: Metadata = {
  title: "Personal",
  robots: { index: false, follow: false },
}

export default async function AdminPersonalPage() {
  await requireSection("personal")
  return (
    <AdminSoon
      title="Personal"
      detail="Desde aquí todavía no se crean cuentas ni se cambian roles. El primer propietario se asigna fuera del sitio, con el script de servidor."
    />
  )
}