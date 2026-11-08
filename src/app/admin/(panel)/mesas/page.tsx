import type { Metadata } from "next"

import { FloorEditor } from "@/components/features/admin/tables/floor-editor"
import { Heading, Text } from "@/components/ui/typography"
import { todayIsoInSantiago } from "@/lib/reservations/schedule"
import { requireSection } from "@/server/auth/access"
import { readFloor } from "@/server/operations/service"

export const instant = false

export const metadata: Metadata = {
  title: "Mesas",
  robots: { index: false, follow: false },
}

export default async function AdminMesasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await requireSection("mesas")
  const params = await searchParams
  const requested = typeof params.date === "string" ? params.date : ""
  const date = /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : todayIsoInSantiago()
  const floor = await readFloor(session, date)

  if (!floor) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-3">
        <Heading as="h1" size="h3">
          Mesas
        </Heading>
        <Text>
          Este proceso no está conectado a Firestore. Desde aquí no se crean mesas ni se marca la configuración como lista para
          confirmar.
        </Text>
      </section>
    )
  }

  return (
    <FloorEditor
      key={date}
      rules={floor.rules}
      date={date}
      day={floor.day}
      bookings={floor.bookings}
      pendingCount={floor.pendingCount}
      pendingTruncated={floor.pendingTruncated}
      confirmedCount={floor.confirmedCount}
    />
  )
}
