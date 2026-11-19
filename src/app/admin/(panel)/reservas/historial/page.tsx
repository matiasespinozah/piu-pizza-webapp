import type { Metadata } from "next"
import Link from "next/link"
import { ChevronLeft, Search } from "lucide-react"

import { ReservationListCard } from "@/components/features/admin/reservations/reservation-admin-ui"
import { Heading } from "@/components/ui/typography"
import { requireSection } from "@/server/auth/access"
import { listReservationHistory } from "@/server/reservations/service"

export const instant = false

export const metadata: Metadata = {
  title: "Historial de reservas",
  robots: { index: false, follow: false },
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined
}

export default async function ReservationHistoryPage({ searchParams }: PageProps) {
  const session = await requireSection("reservas")
  const params = await searchParams
  const cursor = one(params.cursor)
  const result = await listReservationHistory(session, cursor)
  const partial = Boolean(cursor || result.nextCursor)
  const caption =
    result.items.length === 0
      ? "Sin resultados"
      : partial
        ? `${result.items.length} en esta página`
        : `${result.items.length} ${result.items.length === 1 ? "solicitud" : "solicitudes"}`

  return (
    <div className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-4">
      <header className="flex flex-col gap-2">
        <Link href="/admin/reservas" className="inline-flex h-11 w-fit items-center gap-1 text-sm font-semibold text-olive">
          <ChevronLeft aria-hidden className="size-4" />
          Reservas
        </Link>
        <Heading as="h1" size="h3">
          Todas las reservas
        </Heading>
        <p className="text-sm text-olive-muted">De la visita más reciente a la más antigua. Veinte por página.</p>
      </header>

      {!result.ready ? (
        <p className="admin-card p-4 text-sm text-olive-strong">La recepción de reservas sigue desactivada. No hay solicitudes reales que mostrar.</p>
      ) : (
        <div className="flex min-w-0 flex-col gap-2.5">
          <p className="px-1 text-xs font-semibold text-olive-muted">{caption}</p>
          <ul className="flex flex-col gap-2.5">
            {result.items.length === 0 ? (
              <li className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-olive-line px-6 py-10 text-center">
                <Search aria-hidden className="size-6 text-olive-soft" />
                <p className="text-sm text-olive-muted">Todavía no hay reservas guardadas.</p>
              </li>
            ) : null}
            {result.items.map((item) => (
              <li key={item.id}>
                <ReservationListCard item={item} href={`/admin/reservas?id=${item.id}`} selected={false} />
              </li>
            ))}
          </ul>
          {result.nextCursor ? (
            <Link
              href={`/admin/reservas/historial?cursor=${result.nextCursor}`}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-olive-line text-sm font-semibold text-olive"
            >
              Ver más
            </Link>
          ) : null}
        </div>
      )}
    </div>
  )
}
