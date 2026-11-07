import type { Metadata } from "next"

import { AdminSoon } from "@/components/features/admin/admin-soon"
import { requireSection } from "@/server/auth/access"

export const instant = false

export const metadata: Metadata = {
  title: "Configuración",
  robots: { index: false, follow: false },
}

export default async function AdminConfiguracionPage() {
  await requireSection("configuracion")
  return (
    <AdminSoon
      title="Configuración"
      detail="Los horarios y las reglas del local siguen en el código del sitio. Esta pantalla no los modifica."
    />
  )
}
