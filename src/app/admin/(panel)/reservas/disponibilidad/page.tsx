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
    <div className="mx-auto flex w-full max-w-[76rem] min-w-0 flex-col gap-4">
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <Heading as="h1" size="h3">
            Disponibilidad
          </Heading>
          <p className="text-sm text-olive-muted">Cupos web libres por horario. No son mesas físicas.</p>
        </div>
        <Link href="/admin/reservas" className="inline-flex h-11 shrink-0 items-center text-sm font-semibold text-terracotta">
          Reservas
        </Link>
      </header>

      <form method="get" className="admin-card grid min-w-0 grid-cols-1 gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-olive-muted">
          Fecha
          <input name="date" type="date" defaultValue={date} className="admin-control" />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-olive-muted">
          Zona
          <select name="zone" defaultValue={zone} className="admin-control">
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
        <p className="admin-card p-4 text-sm text-olive-strong">La configuración de mesas no está conectada en este entorno.</p>
      ) : floor.day.closed || rows === null ? (
        <p className="admin-card px-4 py-8 text-center text-sm text-olive-muted">
          {floor.day.closed ? "Ese día está cerrado para reservas en línea." : "Falta el horario o la duración de una reserva para armar la grilla."}
        </p>
      ) : rows.length === 0 ? (
        <p className="admin-card px-4 py-8 text-center text-sm text-olive-muted">Ese día no tiene franjas de reserva.</p>
      ) : (
        <section className="admin-card min-w-0 p-3 sm:p-4">
          <div className="mb-3 grid grid-cols-2 gap-2">
            <p className="rounded-2xl bg-[#f3f1e6] px-3 py-2">
              <span className="block text-xs text-olive-muted">Salón</span>
              <span className="font-heading text-xl font-extrabold text-olive">{floor.rules.sectors.salon.web}</span>
              <span className="block text-xs text-olive-muted">cupos web</span>
            </p>
            <p className="rounded-2xl bg-[#f3f1e6] px-3 py-2">
              <span className="block text-xs text-olive-muted">Terraza</span>
              <span className="font-heading text-xl font-extrabold text-olive">{floor.rules.sectors.terrace.web}</span>
              <span className="block text-xs text-olive-muted">cupos web</span>
            </p>
          </div>
          {floor.day.full ? <p className="mb-3 text-sm font-semibold text-status-waiting">Día marcado completo. No entran solicitudes nuevas.</p> : null}
          <QuotaGrid rows={rows} zone={zone} />
          <div className="mt-4">
            <QuotaLegend />
          </div>
        </section>
      )}
    </div>
  )
}
