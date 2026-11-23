import type { Metadata } from "next"
import Link from "next/link"
import { AlertCircle, CalendarCheck, CalendarRange, Clock, Inbox, Search } from "lucide-react"

import { ManualReservationForm } from "@/components/features/admin/reservations/manual-reservation-form"
import { ReservationListCard, SummaryTile } from "@/components/features/admin/reservations/reservation-admin-ui"
import { ReservationDetailPanel } from "@/components/features/admin/reservations/reservation-detail-panel"
import { ReservationFilters } from "@/components/features/admin/reservations/reservation-filters"
import { ReservationScope } from "@/components/features/admin/reservations/reservation-scope"
import { ReservationQuickActions } from "@/components/features/admin/reservations/reservation-quick-actions"
import { ReservationReception } from "@/components/features/admin/reservations/reservation-reception"
import { Heading } from "@/components/ui/typography"
import { cn } from "cn"
import { defaultOperationRules } from "@/lib/reservations/operations"
import { todayIsoInSantiago } from "@/lib/reservations/schedule"
import { pastWindow, staffView } from "@/lib/reservations/staff-views"
import { requireSection } from "@/server/auth/access"
import { readFloor } from "@/server/operations/service"
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
  const today = todayIsoInSantiago()
  const rawView = one(params.view)
  const requested = rawView ? staffView(rawView) : undefined
  const filtersOnly = Boolean(one(params.date) || one(params.status) || one(params.zone) || one(params.q))
  const view = requested ?? (filtersOnly ? undefined : "today")
  const past = pastWindow(view === "past" ? one(params.month) : undefined, today)
  const query = {
    date: one(params.date),
    status: one(params.status),
    zone: one(params.zone),
    view,
    month: view === "past" ? past.month : undefined,
    q: one(params.q),
    cursor: one(params.cursor),
  }
  const serviceRequested = one(params.serviceDate)
  const serviceDate = serviceRequested && /^\d{4}-\d{2}-\d{2}$/.test(serviceRequested) ? serviceRequested : today
  const selectedId = one(params.id)
  const [result, floor, detail] = await Promise.all([
    listReservationsForStaff(session, query),
    readFloor(session, serviceDate).catch(() => null),
    selectedId ? getReservationForStaff(session, selectedId).catch(() => null) : Promise.resolve(null),
  ])
  const filters = { date: query.date, status: query.status, zone: query.zone, view: query.view, month: query.month, q: query.q }
  const anyFilter = Boolean(query.date || query.status || query.zone || query.q)
  const scope = query.view === "today" || query.view === "future" || query.view === "past" ? query.view : null
  const partial = Boolean(query.cursor || result.nextCursor)

  return (
    <div className="mx-auto flex w-full max-w-[76rem] min-w-0 flex-col gap-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col items-start gap-2">
          <a
            href="https://drive.google.com/drive/folders/0AOGhjSyhqHexUk9PVA"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center rounded-lg border-2 border-status-done-solid bg-status-good-solid px-3 text-sm font-semibold text-cream shadow-tactile"
          >
            Respaldo
          </a>
          <Heading as="h1" size="h3">
            Reservas
          </Heading>
          <p className="text-sm text-olive-muted">Confirma, reagenda o anota una mesa. Los cupos avisan, no te frenan.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href="/admin/reservas/historial" className="inline-flex h-11 items-center text-sm font-semibold text-olive">
            Todas las reservas
          </Link>
          <Link href="/admin/reservas/disponibilidad" className="inline-flex h-11 items-center text-sm font-semibold text-terracotta lg:hidden">
            Cupos
          </Link>
          {result.ready ? <ManualReservationForm maxParty={floor?.rules.maxParty ?? defaultOperationRules().maxParty} /> : null}
        </div>
      </header>

      {floor ? (
        <ReservationReception
          key={serviceDate}
          rules={floor.rules}
          date={serviceDate}
          day={floor.day}
          confirmedCount={floor.confirmedCount}
        />
      ) : null}

      {!result.ready ? (
        <p className="admin-card flex items-start gap-3 p-4 text-sm text-olive-strong">
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
            href={hrefOf({ status: "confirmed", date: today })}
            label="Confirmadas hoy"
            value={result.summary?.confirmedToday}
            icon={CalendarCheck}
            iconClass="bg-status-good-soft text-status-good"
            active={!query.view && query.status === "confirmed" && query.date === today}
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

      <ReservationScope active={scope} past={past} />

      <ReservationFilters
        q={query.q}
        date={query.date}
        status={query.status}
        zone={query.zone}
        view={rawView ? query.view : undefined}
        month={query.month}
        active={anyFilter}
      />

      {result.ready ? (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_26rem]">
          {detail ? (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f3f1e6] px-3.5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-8 lg:sticky lg:top-6 lg:z-auto lg:col-start-2 lg:row-start-1 lg:max-h-[calc(100svh-3rem)] lg:overflow-y-auto lg:bg-transparent lg:p-0">
              <ReservationDetailPanel detail={detail} backHref={hrefOf(filters)} />
            </div>
          ) : (
            <div className="hidden flex-col items-center gap-3 rounded-3xl border border-dashed border-olive-line px-6 py-10 text-center lg:col-start-2 lg:row-start-1 lg:flex">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-olive-hover text-olive">
                <Inbox aria-hidden className="size-6" />
              </span>
              <p className="text-sm text-olive-muted">Elige una solicitud para ver el contacto, las acciones y el historial.</p>
            </div>
          )}

          <div className={cn("flex min-w-0 flex-col gap-2.5 lg:col-start-1 lg:row-start-1 lg:max-h-[calc(100svh-3rem)] lg:overflow-y-auto", detail && "max-lg:hidden")}>
            <p className="px-1 text-xs font-semibold text-olive-muted">
              {result.items.length === 0 ? "Sin resultados" : partial ? `${result.items.length} en esta página` : `${result.items.length} ${result.items.length === 1 ? "solicitud" : "solicitudes"}`}
            </p>
            <ul className="flex flex-col gap-2.5">
              {result.items.length === 0 ? (
                <li className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-olive-line px-6 py-10 text-center">
                  <Search aria-hidden className="size-6 text-olive-soft" />
                  <p className="text-sm text-olive-muted">
                    {scope === "past" && past.empty
                      ? `Hoy es el primer día de ${past.label}. Lo de hoy está en Hoy.`
                      : scope === "past"
                        ? `No hay solicitudes en ${past.label}.`
                        : "No hay solicitudes con ese filtro."}
                  </p>
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
                      actions={<ReservationQuickActions item={item} />}
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
