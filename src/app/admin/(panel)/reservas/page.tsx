import type { Metadata } from "next"
import Link from "next/link"

import { ReservationActions } from "@/components/features/admin/reservations/reservation-actions"
import { Eyebrow, Heading, Text } from "@/components/ui/typography"
import { zoneConfig } from "@/lib/reservations/configuration"
import { formatVisitDate } from "@/lib/reservations/schedule"
import { statusLabel } from "@/lib/reservations/views"
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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Eyebrow>PIÙ · reservas</Eyebrow>
        <Heading as="h1" size="h3">
          Solicitudes
        </Heading>
        <Text>
          Una solicitud pendiente no reserva una mesa. La confirmación la hace el equipo, y solo cuando hay una mesa
          válida.
        </Text>
      </header>

      {!result.ready ? (
        <p className="rounded-xl border border-olive-line bg-surface-raised p-4 text-sm text-olive-strong">
          La recepción de reservas sigue desactivada. No hay solicitudes reales que mostrar.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryLink href={hrefOf({ view: "attention" })} label="Requieren atención" value={result.summary?.attention} />
          <SummaryLink href={hrefOf({ view: "pending" })} label="Pendientes" value={result.summary?.pending} />
          <SummaryLink href={hrefOf({ view: "today" })} label="Confirmadas hoy" value={result.summary?.confirmedToday} />
          <SummaryLink href={hrefOf({ view: "upcoming" })} label="Próximas confirmadas" value={result.summary?.upcoming} />
        </ul>
      )}

      <form method="get" action="/admin/reservas" className="flex flex-wrap items-end gap-3">
        <label className="flex w-full min-w-0 flex-col gap-1 text-sm font-semibold sm:w-auto sm:min-w-[10rem] sm:flex-1">
          Fecha
          <input name="date" type="date" defaultValue={query.date} className="h-11 w-full min-w-0 rounded-lg border border-input px-3 [min-inline-size:0]" />
        </label>
        <label className="flex w-full min-w-0 flex-col gap-1 text-sm font-semibold sm:w-auto sm:min-w-[10rem] sm:flex-1">
          Estado
          <select name="status" defaultValue={query.status ?? ""} className="h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-3">
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
        <label className="flex w-full min-w-0 flex-col gap-1 text-sm font-semibold sm:w-auto sm:min-w-[8rem] sm:flex-1">
          Zona
          <select name="zone" defaultValue={query.zone ?? ""} className="h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-3">
            <option value="">Todas</option>
            <option value="salon">Salón</option>
            <option value="terrace">Terraza</option>
          </select>
        </label>
        <label className="flex w-full min-w-0 flex-col gap-1 text-sm font-semibold sm:w-auto sm:min-w-[12rem] sm:flex-[2]">
          Nombre o referencia
          <input name="q" defaultValue={query.q} className="h-11 w-full min-w-0 rounded-lg border border-input px-3" />
        </label>
        {query.view ? <input type="hidden" name="view" value={query.view} /> : null}
        <button type="submit" className="h-11 rounded-lg bg-olive px-4 font-semibold text-cream">
          Filtrar
        </button>
        <Link href="/admin/reservas" className="inline-flex h-11 items-center px-2 text-sm font-semibold underline">
          Limpiar
        </Link>
      </form>

      {result.ready ? (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <ul className="flex flex-col gap-3">
            {result.items.length === 0 ? <li className="text-sm text-olive-muted">No hay solicitudes con ese filtro.</li> : null}
            {result.items.map((item) => (
              <li key={item.id}>
                <Link
                  href={hrefOf({ ...filters, id: item.id })}
                  className="flex flex-col gap-1 rounded-xl border border-olive-line bg-surface-raised p-4 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-heading text-base font-bold">{item.customerName}</span>
                    <span className="rounded-full bg-olive-wash px-2 py-1 text-xs font-semibold">{statusLabel[item.status]}</span>
                  </span>
                  <span className="text-sm text-olive-strong">
                    {formatVisitDate(item.date)} · {item.preferredTime} · {item.partySize} personas · {zoneConfig(item.preferredZone).label}
                  </span>
                  <span className="font-label text-xs text-olive-muted">
                    {item.referenceCode} · solicitada {item.createdAt.slice(0, 16).replace("T", " ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {detail ? (
            <article className="flex flex-col gap-4 rounded-xl border border-olive-line bg-surface-raised p-4">
              <header>
                <h2 className="font-heading text-xl font-bold">{detail.customerName}</h2>
                <p className="text-sm text-olive-muted">{statusLabel[detail.status]} · {detail.referenceCode}</p>
              </header>
              <dl className="grid grid-cols-1 gap-2 text-sm">
                <div>
                  <dt className="text-olive-muted">Cuándo</dt>
                  <dd>{formatVisitDate(detail.date)} · {detail.preferredTime}</dd>
                </div>
                <div>
                  <dt className="text-olive-muted">Personas y zona</dt>
                  <dd>{detail.partySize} · {zoneConfig(detail.preferredZone).label}</dd>
                </div>
                <div>
                  <dt className="text-olive-muted">Celular</dt>
                  <dd>{detail.customerPhone}</dd>
                </div>
                <div>
                  <dt className="text-olive-muted">Observaciones</dt>
                  <dd>{detail.notes || "Sin observaciones."}</dd>
                </div>
                <div>
                  <dt className="text-olive-muted">Mesa asignada</dt>
                  <dd>{detail.assignedTableIds.length > 0 ? detail.assignedTableIds.join(", ") : "Todavía no hay mesa."}</dd>
                </div>
              </dl>
              <a
                href={`tel:${detail.customerPhone.replaceAll(" ", "")}`}
                className="inline-flex h-12 items-center justify-center rounded-lg border border-olive font-semibold"
              >
                Llamar
              </a>
              <p className="text-sm text-olive-muted">Esto abre el teléfono. PIÙ no envía un mensaje automático ni marca al cliente como avisado.</p>
              <ReservationActions reservation={detail} />
              <section>
                <h3 className="font-heading text-base font-bold">Historial</h3>
                <ol className="mt-2 flex flex-col gap-2">
                  {detail.events.map((event, index) => (
                    <li key={`${event.at}-${index}`} className="text-sm">
                      <span className="font-semibold">{event.action}</span>
                      <span className="text-olive-muted">
                        {" "}
                        {event.fromStatus ? statusLabel[event.fromStatus] : "—"} → {statusLabel[event.toStatus]}
                        {event.actorUid ? ` · ${event.actorUid}` : ""}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            </article>
          ) : (
            <p className="text-sm text-olive-muted">Elige una solicitud para ver el celular, las observaciones y el historial.</p>
          )}
          {result.nextCursor ? (
            <Link href={hrefOf({ ...filters, cursor: result.nextCursor })} className="text-sm font-semibold underline lg:col-span-2">
              Ver más
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function SummaryLink({ href, label, value }: { href: string; label: string; value: number | null | undefined }) {
  return (
    <li>
      <Link href={href} className="block rounded-xl border border-olive-line bg-surface-raised p-4">
        <span className="block text-sm text-olive-muted">{label}</span>
        <span className="mt-2 block font-heading text-2xl font-bold">{value == null ? "No disponible" : value}</span>
      </Link>
    </li>
  )
}
