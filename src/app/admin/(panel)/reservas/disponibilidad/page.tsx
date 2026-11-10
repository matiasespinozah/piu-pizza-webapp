import type { Metadata } from "next"
import Link from "next/link"

import { QuotaGrid, QuotaLegend } from "@/components/features/admin/quota-board"
import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/typography"
import { todayIsoInSantiago } from "@/lib/reservations/schedule"
import { webQuotaRows } from "@/lib/reservations/web-quota"
import { requireSection } from "@/server/auth/access"
import { readFloor } from "@/server/operations/service"

export const instant = false

export const metadata: Metadata = {
  title: "Disponibilidad",
  robots: { index: false, follow: false },
}

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined
}

export default async function DisponibilidadPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await requireSection("reservas")
  const params = await searchParams
  const requested = one(params.date) ?? ""
  const date = /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : todayIsoInSantiago()
  const requestedZone = one(params.zone)
  const zone = requestedZone === "salon" || requestedZone === "terrace" ? requestedZone : "all"
  const floor = await readFloor(session, date).catch(() => null)
  const rows = floor
    ? webQuotaRows({
        date,
        week: floor.rules.week,
        serviceMinutes: floor.rules.serviceMinutes,
        web: { salon: floor.rules.sectors.salon.web, terrace: floor.rules.sectors.terrace.web },
        bookings: floor.bookings,
        visit: floor.day,
      })
    : null

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <Heading as="h1" size="h3">
            Disponibilidad
          </Heading>
          <p className="text-sm text-olive-muted">Cupos web por horario. No es la ocupación física del local.</p>
        </div>
        <Link href="/admin/reservas" className="text-sm font-semibold text-olive underline-offset-4 hover:underline">
          Reservas
        </Link>
      </header>

      <form method="get" className="grid grid-cols-1 gap-2 rounded-2xl border border-olive-line bg-surface-raised p-3 shadow-tactile sm:grid-cols-[1fr_1fr_auto]">
        <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-olive-muted">
          Fecha
          <input
            name="date"
            type="date"
            defaultValue={date}
            className="h-11 w-full min-w-0 rounded-xl border border-input bg-cream px-3 [min-inline-size:0]"
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-olive-muted">
          Zona
          <select
            name="zone"
            defaultValue={zone}
            className="h-11 w-full rounded-xl border border-input bg-cream px-3"
          >
            <option value="all">Todas las zonas</option>
            <option value="salon">Salón</option>
            <option value="terrace">Terraza</option>
          </select>
        </label>
        <Button type="submit" className="h-11 self-end rounded-xl">
          Ver
        </Button>
      </form>

      {!floor ? (
        <p className="rounded-2xl border border-olive-line bg-surface-raised p-4 text-sm text-olive-strong">
          La configuración de mesas no está conectada en este entorno.
        </p>
      ) : floor.day.closed || rows === null ? (
        <p className="rounded-2xl border border-dashed border-olive-line px-4 py-8 text-center text-sm text-olive-muted">
          {floor.day.closed ? "Ese día está cerrado para reservas en línea." : "Falta el horario o la duración de una reserva para armar la grilla."}
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-olive-line px-4 py-8 text-center text-sm text-olive-muted">Ese día no tiene franjas de reserva.</p>
      ) : (
        <section className="rounded-2xl border border-olive-line bg-surface-raised p-3 shadow-tactile sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-olive-muted">
            <p>
              Salón {floor.rules.sectors.salon.web} cupos web · Terraza {floor.rules.sectors.terrace.web} cupos web
              {floor.day.full ? " · día marcado completo" : ""}
            </p>
          </div>
          <QuotaGrid rows={rows} zone={zone} />
          <div className="mt-4">
            <QuotaLegend />
          </div>
        </section>
      )}
    </div>
  )
}
