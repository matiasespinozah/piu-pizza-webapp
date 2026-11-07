import type { Metadata } from "next"

import { AdminSoon } from "@/components/features/admin/admin-soon"
import { requireSection } from "@/server/auth/access"

export const instant = false

export const metadata: Metadata = {
  title: "Mesas",
  robots: { index: false, follow: false },
}

export default async function AdminMesasPage() {
  await requireSection("mesas")
  return (
    <AdminSoon
      title="Mesas"
      detail="El plano de mesas todavía no está conectado. No hay cupos ni ocupación inventados."
    />
  )
}
