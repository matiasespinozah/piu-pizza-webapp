import Link from "next/link"
import { AlertTriangle, ArrowRight, CalendarDays, LayoutGrid, ListChecks, UtensilsCrossed, Zap, type LucideIcon } from "lucide-react"
import { cn } from "cn"

import { zoneConfig } from "@/lib/reservations/configuration"
import type { QuotaRow } from "@/lib/reservations/web-quota"
import type { ReservationListItem } from "@/lib/reservations/views"

type Metric = {
  title: string
  value: number | null
  icon: LucideIcon
  href: string
}

type AlertItem = { id: string; text: string; tone: "waiting" | "closed" | "good" }

const dotClass = {
  waiting: "bg-status-waiting-solid",
  closed: "bg-status-closed",
  good: "bg-status-good-solid",
} as const

function dashboardDateLabel(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number)
  if (!year || !month || !day) return "Hoy"
  const formatted = new Intl.DateTimeFormat("es-CL", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  })
    .format(new Date(Date.UTC(year, month - 1, day)))
    .replaceAll(".", "")
    .replaceAll(",", "")
    .replace(/\s+/g, " ")
    .trim()
  return `Hoy, ${formatted}`
}

function AdminDashboard({
  today,
  ready,
  metrics,
  upcoming,
  alerts,
  rows,
  closed,
}: {
  today: string
  ready: boolean
  metrics: Metric[]
  upcoming: ReservationListItem[]
  alerts: AlertItem[]
  rows: QuotaRow[] | null
  closed: boolean
}) {
  return (
    <div className="mx-auto flex w-full max-w-[76rem] flex-col gap-3.5 lg:gap-5">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h1 className="min-w-0 font-heading text-[1.7rem] leading-none font-extrabold tracking-tight text-olive">Dashboard</h1>
          <p className="admin-date-pill inline-flex h-8 shrink-0 items-center gap-1 rounded-xl px-2 text-[0.6875rem] font-semibold text-olive">
            <CalendarDays aria-hidden className="size-3.5 text-terracotta" />
            <span className="capitalize">{dashboardDateLabel(today)}</span>
          </p>
        </div>
        <p className="flex items-center gap-2 text-sm text-olive-muted">
          <LayoutGrid aria-hidden className="size-4 text-terracotta" />
          Resumen de la operación de hoy
        </p>
      </header>

      {!ready ? (
        <p className="admin-card px-4 py-3 text-sm text-olive-strong">La recepción de reservas sigue desactivada, así que no hay solicitudes reales que contar.</p>
      ) : null}

      <ul className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
        {metrics.map((metric) => (
          <li key={metric.title}>
            <StatCard metric={metric} ready={ready} />
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-1 gap-2.5 min-[390px]:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)] lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.7fr)] lg:gap-4">
        <section className="admin-card px-3.5 py-3.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-heading text-base font-extrabold text-olive">Reservas próximas</h2>
            <Link href="/admin/reservas?view=upcoming" className="inline-flex items-center gap-0.5 text-xs font-semibold text-olive-muted">
              Ver todas
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="py-4 text-sm text-olive-muted">No hay confirmadas próximas.</p>
          ) : (
            <ul>
              {upcoming.map((item) => (
                <li key={item.id} className="border-t border-olive-line/70 first:border-t-0">
                  <Link href={`/admin/reservas?id=${item.id}#detalle`} className="grid min-h-11 grid-cols-[2.6rem_minmax(0,1fr)] items-center gap-x-2 py-2 text-sm">
                    <span className="row-span-2 font-semibold text-olive-strong">{item.preferredTime}</span>
                    <span className="truncate font-semibold text-olive">{item.customerName}</span>
                    <span className="truncate text-xs text-olive-muted">
                      {item.partySize} pers. · {zoneConfig(item.preferredZone).label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-card px-3.5 py-3.5">
          <h2 className="mb-2 flex items-center gap-1.5 font-heading text-base font-extrabold text-olive">
            <AlertTriangle aria-hidden className="size-4 text-terracotta" />
            Alertas del día
          </h2>
          {alerts.length === 0 ? (
            <p className="py-4 text-sm text-olive-muted">Sin alertas por ahora.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {alerts.map((alert) => (
                <li key={alert.id} className="flex items-start gap-2 text-sm leading-snug text-olive-strong">
                  <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", dotClass[alert.tone])} />
                  {alert.text}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[minmax(0,1.7fr)_minmax(16rem,0.75fr)] lg:gap-4">
      <section className="admin-card px-3.5 py-3.5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-heading text-base font-extrabold text-olive">Ocupación por horario</h2>
          <Link href={`/admin/reservas/disponibilidad?date=${today}`} className="inline-flex items-center gap-0.5 text-xs font-semibold text-olive-muted">
            Ver detalle
            <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        </div>
        {rows && rows.length > 0 ? <DashboardQuotaChart rows={rows} /> : <p className="py-6 text-sm text-olive-muted">{closed ? "Hoy no hay horario de reservas." : "Todavía no hay cupos web para graficar este día."}</p>}
        <p className="mt-2 text-[0.6875rem] leading-snug text-olive-muted">Cupos web de salón y terraza. No mide mesas físicas ocupadas.</p>
      </section>

      <section className="admin-card px-3.5 py-3.5">
        <h2 className="mb-3 flex items-center gap-1.5 font-heading text-base font-extrabold text-olive">
          <Zap aria-hidden className="size-4 text-terracotta" />
          Acciones rápidas
        </h2>
        <div className="flex flex-col gap-2 lg:h-full lg:justify-center">
          <Link href="/admin/reservas?view=pending" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-terracotta text-sm font-bold text-cream shadow-tactile">
            <ListChecks aria-hidden className="size-4" />
            Ver reservas pendientes
          </Link>
          <Link href="/admin/mesas" className="admin-action-secondary inline-flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-bold">
            <UtensilsCrossed aria-hidden className="size-4" />
            Gestionar mesas
          </Link>
          <Link href="/admin/reservas/disponibilidad" className="admin-action-secondary inline-flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-bold">
            <CalendarDays aria-hidden className="size-4" />
            Ver disponibilidad
          </Link>
        </div>
      </section>
      </div>
    </div>
  )
}

function StatCard({ metric, ready }: { metric: Metric; ready: boolean }) {
  const Icon = metric.icon
  return (
    <Link href={metric.href} className="admin-card flex h-full min-h-[6.6rem] flex-col justify-between px-3.5 py-3">
      <span className="flex items-start gap-1.5 text-[0.75rem] leading-tight font-semibold text-olive-strong">
        <Icon aria-hidden className="size-4 text-terracotta" />
        {metric.title}
      </span>
      <span className="font-heading text-[2rem] leading-none font-extrabold tracking-tight text-olive">{!ready || metric.value == null ? "—" : metric.value}</span>
    </Link>
  )
}

function DashboardQuotaChart({ rows }: { rows: QuotaRow[] }) {
  const marks = [100, 80, 60, 40, 20, 0]
  return (
    <div className="flex gap-2" role="img" aria-label="Porcentaje de cupos web ocupados en cada franja">
      <div className="flex h-36 flex-col justify-between text-[0.625rem] text-olive-muted lg:h-52">
        {marks.map((mark) => (
          <span key={mark}>{mark}%</span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex h-36 items-end gap-1 border-b border-olive-line/80 lg:h-52">
          {rows.map((row) => {
            const web = row.salon.web + row.terrace.web
            const used = row.salon.used + row.terrace.used
            const ratio = web > 0 ? Math.min(1, used / web) : 0
            return (
              <div key={row.time} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                <div
                  className="w-full rounded-t-sm bg-status-good-solid"
                  style={{ height: `${Math.max(ratio === 0 ? 0 : 6, Math.round(ratio * 100))}%` }}
                  title={`${row.time}: ${used} de ${web} cupos web`}
                />
              </div>
            )
          })}
        </div>
        <div className="mt-1 flex gap-1">
          {rows.map((row, index) => (
            <span key={row.time} className="flex-1 truncate text-center text-[0.5625rem] text-olive-muted">
              {index % 2 === 0 ? row.time.slice(0, 2) : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function alertItems(input: { paused: boolean; closed: boolean; full: boolean; pending: number | null }): AlertItem[] {
  const items: AlertItem[] = []
  if (input.pending) items.push({ id: "pending", text: `${input.pending} solicitudes pendientes de confirmar.`, tone: "waiting" })
  if (input.paused) items.push({ id: "paused", text: "La recepción de reservas en línea está en pausa.", tone: "waiting" })
  if (input.full) items.push({ id: "full", text: "Hoy las reservas en línea están completas.", tone: "closed" })
  if (input.closed) items.push({ id: "closed", text: "Hoy el local está cerrado para reservas.", tone: "good" })
  return items
}

export { AdminDashboard, alertItems, dashboardDateLabel }
export type { Metric }
