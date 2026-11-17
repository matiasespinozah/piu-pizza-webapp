import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { requireSection } from "@/server/auth/access"

export const instant = false

export const metadata: Metadata = {
  title: "Mesas",
  robots: { index: false, follow: false },
}

export default async function AdminMesasPage() {
  await requireSection("mesas")
  redirect("/admin/reservas")
}
