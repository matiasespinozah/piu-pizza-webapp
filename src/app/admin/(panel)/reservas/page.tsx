import type { Metadata } from "next"

import { AdminSoon } from "@/components/features/admin/admin-soon"
import { requireSection } from "@/server/auth/access"

export const instant = false

export const metadata: Metadata = {
  title: "Reservas",
  robots: { index: false, follow: false },
}

export default async function AdminReservasPage() {
  await requireSection("reservas")
  return (
    <AdminSoon
      title="Reservas"
      detail="Esta sección todavía no consulta solicitudes. El formulario público sigue en vista previa y no guarda reservas."
    />
  )
}
