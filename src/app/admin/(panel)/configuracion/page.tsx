import type { Metadata } from "next"

import { RestaurantSettings } from "@/components/features/admin/tables/restaurant-settings"
import { Heading, Text } from "@/components/ui/typography"
import { todayIsoInSantiago } from "@/lib/reservations/schedule"
import { requireSection } from "@/server/auth/access"
import { readFloor } from "@/server/operations/service"

export const instant = false

export const metadata: Metadata = {
  title: "Configuración",
  robots: { index: false, follow: false },
}

export default async function AdminConfiguracionPage() {
  const session = await requireSection("configuracion")
  const floor = await readFloor(session, todayIsoInSantiago()).catch(() => null)

  if (!floor) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-3">
        <Heading as="h1" size="h3">
          Configuración
        </Heading>
        <Text>Este proceso no está conectado a Firestore. Desde aquí no se cambian horarios ni cupos.</Text>
      </section>
    )
  }

  return <RestaurantSettings rules={floor.rules} confirmedCount={floor.confirmedCount} />
}
