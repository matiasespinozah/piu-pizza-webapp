import type { Metadata } from "next"

import { AdminSoon } from "@/components/features/admin/admin-soon"
import { requireSection } from "@/server/auth/access"

export const instant = false

export const metadata: Metadata = {
  title: "Carta",
  robots: { index: false, follow: false },
}

export default async function AdminCartaPage() {
  await requireSection("carta")
  return (
    <AdminSoon
      title="Carta"
      detail="Desde aquí todavía no se edita la carta. La página pública sigue con el catálogo local."
    />
  )
}
