import type { Metadata } from "next"
import Link from "next/link"
import { AlertCircle, CalendarCheck, CalendarRange, Clock, Inbox, Search } from "lucide-react"

import { ReservationListCard, SummaryTile } from "@/components/features/admin/reservations/reservation-admin-ui"
import { ReservationDetailPanel } from "@/components/features/admin/reservations/reservation-detail-panel"
import { ReservationQuickActions } from "@/components/features/admin/reservations/reservation-quick-actions"
import { Button } from "@/components/ui/button"
import { Eyebrow, Heading } from "@/components/ui/typography"
import { requireSection } from "@/server/auth/access"
import { getReservationForStaff, listReservationsForStaff } from "@/server/reservations/service"

export const instant = false

export const metadata: Metadata = {
  title: "Reservas",
  robots: { index: false, follow: false },
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined
}

const fieldClass =
  "h-11 w-full min-w-0 rounded-xl border border-input bg-cream px-3 text-base text-olive outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"

function hrefOf(params: Record<string, string | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value)
  }
  const text = search.toString()
  return text ? `/admin/reservas?${text}` : "/admin/reservas"
}

export default async function AdminReservasPage({ searchParams }: PageProps) {
  const session = await requireSection("reservas")
  const params = await searchParams
  const query = {
    date: one(params.date),
    status: one(params.status),
    zone: one(params.zone),
    view: one(params.view),
    q: one(params.q),
    cursor: one(params.cursor),
  }
  const result = await listReservationsForStaff(session, query)
  const selectedId = one(params.id)
  const detail = result.ready && selectedId ? await getReservationForStaff(session, selectedId).catch(() => null) : null
  const filters = { date: query.date, status: query.status, zone: query.zone, view: query.view, q: query.q }
  const anyFilter = Boolean(query.date || query.status || query.zone || query.q || query.view)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <Eyebrow>PIÙ · reservas</Eyebrow>
        <div className="flex items-end justify-between gap-3">
          <Heading as="h1" size="h3">
            Reservas
          </Heading>
          <Link href="/admin/reservas/disponibilidad" className="text-sm font-semibold text-olive underline-offset-4 hover:underline">
            Disponibilidad
          </Link>
        </div>
        <p className="text-sm text-olive-muted">Pendiente no reserva mesa. La confirma el equipo, con una mesa válida.</p>
      </header>

      {!result.ready ? (
        <p className="flex items-start gap-3 rounded-2xl border border-olive-line bg-surface-raised p-4 text-sm text-olive-strong">
          <Inbox aria-hidden className="mt-0.5 size-5 shrink-0 text-olive-muted" />
          La recepción de reservas sigue desactivada. No hay solicitudes reales que mostrar.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          <SummaryTile
            href={hrefOf({ view: "attention" })}
            label="Requieren atención"
            value={result.summary?.attention}
            icon={AlertCircle}
            iconClass="bg-terracotta text-cream"
            active={query.view === "attention"}
          />
          <SummaryTile
            href={hrefOf({ view: "pending" })}
            label="Pendientes"
            value={result.summary?.pending}
            icon={Clock}
            iconClass="bg-status-waiting-soft text-status-waiting"
            active={query.view === "pending"}
          />
          <SummaryTile
            href={hrefOf({ view: "today" })}
            label="Confirmadas hoy"
            value={result.summary?.confirmedToday}
            icon={CalendarCheck}
            iconClass="bg-status-good-soft text-status-good"
            active={query.view === "today"}
          />
          <SummaryTile
            href={hrefOf({ view: "upcoming" })}
            label="Próximas confirmadas"
            value={result.summary?.upcoming}
            icon={CalendarRange}
            iconClass="bg-olive text-cream"
            active={query.view === "upcoming"}
          />
        </ul>
      )}

      <form method="get" action="/admin/reservas" className="flex flex-col gap-2 rounded-2xl border border-olive-line bg-surface-raised p-2.5 shadow-tactile sm:p-3">
        <div className="flex gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Nombre o referencia</span>
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-olive-muted" />
            <input name="q" defaultValue={query.q} placeholder="Nombre o referencia" className={`${fieldClass} pl-9`} />
          </label>
          <Button type="submit" className="h-11 shrink-0 rounded-xl">
            Filtrar
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-olive-muted">
              Fecha
              <input name="date" type="date" defaultValue={query.date} className={`${fieldClass} [min-inline-size:0]`} />
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-olive-muted">
              Estado
              <select name="status" defaultValue={query.status ?? ""} className={fieldClass}>
                <option value="">Todos</option>
                <option value="pending">Pendiente</option>
                <option value="confirmed">Confirmada</option>
                <option value="reschedule_requested">Cambio propuesto</option>
                <option value="rejected">Rechazada</option>
                <option value="cancelled">Cancelada</option>
                <option value="arrived">Llegó</option>
                <option value="completed">Finalizada</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-olive-muted">
              Zona
              <select name="zone" defaultValue={query.zone ?? ""} className={fieldClass}>
                <option value="">Todas</option>
                <option value="salon">Salón</option>
                <option value="terrace">Terraza</option>
              </select>
            </label>
        </div>
        {query.view ? <input type="hidden" name="view" value={query.view} /> : null}
        {anyFilter ? (
          <Link href="/admin/reservas" className="inline-flex h-9 items-center self-start px-2 text-sm font-semibold text-olive underline underline-offset-4">
            Limpiar filtros
          </Link>
        ) : null}
      </form>

      {result.ready ? (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
          {detail ? (
            <ReservationDetailPanel
              detail={detail}
              backHref={hrefOf(filters)}
              className="order-first lg:sticky lg:top-4 lg:order-none lg:col-start-2 lg:row-start-1"
            />
          ) : (
            <div className="hidden flex-col items-center gap-3 rounded-3xl border border-dashed border-olive-line px-6 py-10 text-center lg:col-start-2 lg:row-start-1 lg:flex">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-olive-hover text-olive">
                <Inbox aria-hidden className="size-6" />
              </span>
              <p className="text-sm text-olive-muted">Elige una solicitud para ver el contacto, las acciones y el historial.</p>
            </div>
          )}

          <div className="flex min-w-0 flex-col gap-2.5 lg:col-start-1 lg:row-start-1">
            <p className="px-1 text-xs font-semibold text-olive-muted">
              {result.items.length === 0 ? "Sin resultados" : `${result.items.length} ${result.items.length === 1 ? "solicitud" : "solicitudes"}`}
            </p>
            <ul className="flex flex-col gap-2.5">
              {result.items.length === 0 ? (
                <li className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-olive-line px-6 py-10 text-center">
                  <Search aria-hidden className="size-6 text-olive-soft" />
                  <p className="text-sm text-olive-muted">No hay solicitudes con ese filtro.</p>
                </li>
              ) : null}
              {result.items.map((item) => {
                const href = `${hrefOf({ ...filters, id: item.id })}#detalle`
                return (
                  <li key={item.id}>
                    <ReservationListCard
                      item={item}
                      href={href}
                      selected={item.id === selectedId}
                      actions={<ReservationQuickActions id={item.id} status={item.status} revision={item.revision} detailHref={href} />}
                    />
                  </li>
                )
              })}
            </ul>
            {result.nextCursor ? (
              <Link
                href={hrefOf({ ...filters, cursor: result.nextCursor })}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-olive-line text-sm font-semibold text-olive"
              >
                Ver más
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
