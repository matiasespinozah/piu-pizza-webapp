import type { Metadata } from "next"
import Link from "next/link"
import { AlertCircle, ArrowRight, CalendarCheck, CalendarRange, Clock, PauseCircle } from "lucide-react"

import { QuotaChart } from "@/components/features/admin/quota-board"
import { Heading } from "@/components/ui/typography"
import { zoneConfig } from "@/lib/reservations/configuration"
import { formatVisitDate, todayIsoInSantiago } from "@/lib/reservations/schedule"
import { webQuotaRows } from "@/lib/reservations/web-quota"
import { requireSection } from "@/server/auth/access"
import { readFloor } from "@/server/operations/service"
import { listReservationsForStaff, reservationSummary } from "@/server/reservations/service"

export const instant = false

export const metadata: Metadata = {
  title: "Inicio",
  robots: { index: false, follow: false },
}

export default async function AdminHomePage() {
  const session = await requireSection("inicio")
  const today = todayIsoInSantiago()
  const [reservations, upcoming, floor] = await Promise.all([
    reservationSummary(session),
    listReservationsForStaff(session, { view: "upcoming" }),
    readFloor(session, today).catch(() => null),
  ])
  const summary = reservations.summary
  const metrics = [
    { title: "Confirmadas hoy", value: summary?.confirmedToday, icon: CalendarCheck, href: "/admin/reservas?view=today" },
    { title: "Pendientes", value: summary?.pending, icon: Clock, href: "/admin/reservas?view=pending" },
    { title: "Requieren atención", value: summary?.attention, icon: AlertCircle, href: "/admin/reservas?view=attention" },
    { title: "Próximas confirmadas", value: summary?.upcoming, icon: CalendarRange, href: "/admin/reservas?view=upcoming" },
  ]
  const rows =
    floor && !floor.day.closed
      ? webQuotaRows({
          date: today,
          week: floor.rules.week,
          serviceMinutes: floor.rules.serviceMinutes,
          web: { salon: floor.rules.sectors.salon.web, terrace: floor.rules.sectors.terrace.web },
          bookings: floor.bookings,
          visit: floor.day,
        })
      : null
  const alerts = floor
    ? [
        floor.rules.receptionPaused ? "La recepción de reservas en línea está en pausa." : null,
        floor.day.closed ? "Hoy el local está marcado como cerrado para reservas." : null,
        floor.day.full ? "Hoy las reservas en línea están marcadas como completas." : null,
        summary?.pending ? `${summary.pending} solicitudes pendientes de confirmar.` : null,
      ].filter((item): item is string => Boolean(item))
    : []
  const nextItems = upcoming.ready ? upcoming.items.filter((item) => item.status === "confirmed").slice(0, 4) : []

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <Heading as="h1" size="h3">
            Hoy
          </Heading>
          <p className="text-sm text-olive-muted capitalize">{formatVisitDate(today)}</p>
        </div>
        <Link href={`/admin/reservas/disponibilidad?date=${today}`} className="text-sm font-semibold text-olive underline-offset-4 hover:underline">
          Ver otro día
        </Link>
      </header>

      {!reservations.ready ? (
        <p className="rounded-2xl border border-olive-line bg-surface-raised p-4 text-sm text-olive-strong">
          La recepción de reservas sigue desactivada, así que no hay solicitudes reales que contar.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2.5">
          {metrics.map((metric) => {
            const Icon = metric.icon
            return (
              <li key={metric.title}>
                <Link href={metric.href} className="flex h-full flex-col gap-2 rounded-2xl border border-olive-line bg-surface-raised p-3.5 shadow-tactile">
                  <span className="flex items-center justify-between gap-2 text-sm text-olive-muted">
                    {metric.title}
                    <Icon aria-hidden className="size-4 text-terracotta" />
                  </span>
                  <span className="font-heading text-3xl leading-none font-extrabold text-olive">
                    {metric.value == null ? "—" : metric.value}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <section className="rounded-2xl border border-olive-line bg-surface-raised p-4 shadow-tactile">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-heading text-lg font-bold">Reservas próximas</h2>
          <Link href="/admin/reservas?view=upcoming" className="inline-flex items-center gap-1 text-sm font-semibold text-olive">
            Ver todas
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
        {nextItems.length === 0 ? (
          <p className="text-sm text-olive-muted">No hay confirmadas próximas.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-olive-line">
            {nextItems.map((item) => (
              <li key={item.id}>
                <Link href={`/admin/reservas?id=${item.id}#detalle`} className="flex items-center gap-3 py-3">
                  <span className="w-12 shrink-0 font-heading text-sm font-extrabold">{item.preferredTime}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{item.customerName}</span>
                  <span className="shrink-0 text-xs text-olive-muted">
                    {item.partySize} pers. · {zoneConfig(item.preferredZone).label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {alerts.length > 0 ? (
        <section className="rounded-2xl border border-olive-line bg-surface-raised p-4 shadow-tactile">
          <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-bold">
            <AlertCircle aria-hidden className="size-5 text-terracotta" />
            Alertas de hoy
          </h2>
          <ul className="flex flex-col gap-2">
            {alerts.map((alert) => (
              <li key={alert} className="flex items-start gap-2 text-sm text-olive-strong">
                {alert.includes("pausa") ? <PauseCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-status-waiting" /> : <span className="mt-1.5 size-2 shrink-0 rounded-full bg-terracotta" />}
                {alert}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-olive-line bg-surface-raised p-4 shadow-tactile">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-heading text-lg font-bold">Cupos web por horario</h2>
          <Link href={`/admin/reservas/disponibilidad?date=${today}`} className="text-sm font-semibold text-olive">
            Ver detalle
          </Link>
        </div>
        {rows && rows.length > 0 ? (
          <QuotaChart rows={rows} />
        ) : (
          <p className="text-sm text-olive-muted">
            {floor?.day.closed
              ? "Hoy no hay horario de reservas."
              : "Los cupos de hoy aparecen cuando la configuración de mesas está conectada y el día está abierto."}
          </p>
        )}
        <p className="mt-3 text-xs text-olive-muted">Cada barra suma los cupos web de salón y terraza. No mide mesas físicas ocupadas.</p>
      </section>

      <section className="rounded-2xl border border-olive-line bg-surface-raised p-4 shadow-tactile">
        <h2 className="mb-3 font-heading text-lg font-bold">Acciones rápidas</h2>
        <div className="flex flex-col gap-2">
          <Link href="/admin/reservas?view=pending" className="inline-flex h-12 items-center justify-center rounded-xl bg-terracotta font-semibold text-cream shadow-tactile">
            Ver pendientes
          </Link>
          <Link href="/admin/mesas" className="inline-flex h-12 items-center justify-center rounded-xl border border-olive-line bg-cream font-semibold text-olive">
            Gestionar mesas
          </Link>
          <Link href="/admin/reservas/disponibilidad" className="inline-flex h-12 items-center justify-center rounded-xl border border-olive-line bg-cream font-semibold text-olive">
            Ver disponibilidad
          </Link>
        </div>
      </section>
    </div>
  )
}
