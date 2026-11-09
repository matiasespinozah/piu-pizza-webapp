import type { ReactNode } from "react"
import Link from "next/link"
import { ChevronRight, MapPin, Users, type LucideIcon } from "lucide-react"
import { cn } from "cn"

import { ReservationStatusBadge } from "@/components/features/reservations/reservation-status-badge"
import { zoneConfig } from "@/lib/reservations/configuration"
import { statusTone, type StatusTone } from "@/lib/reservations/status-tone"
import type { ReservationEvent, ReservationListItem } from "@/lib/reservations/views"
import { statusLabel } from "@/lib/reservations/views"

const toneBar: Record<StatusTone, string> = {
  waiting: "bg-status-waiting-solid",
  good: "bg-status-good-solid",
  done: "bg-status-done-solid",
  rejected: "bg-status-closed",
  neutral: "bg-olive-soft",
}

const toneDot: Record<StatusTone, string> = {
  waiting: "bg-status-waiting-solid ring-status-waiting-soft",
  good: "bg-status-good-solid ring-status-good-soft",
  done: "bg-status-done-solid ring-status-good-soft",
  rejected: "bg-status-closed ring-status-closed-soft",
  neutral: "bg-olive-soft ring-olive-hover",
}

/** «vie 13 nov» sin depender de la zona del servidor: la fecha ya es civil. */
function shortDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number)
  if (!year || !month || !day) return isoDate
  return new Intl.DateTimeFormat("es-CL", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" })
    .format(new Date(Date.UTC(year, month - 1, day)))
    .replaceAll(".", "")
    .replace(",", "")
}

function SummaryTile({
  href,
  label,
  value,
  icon: Icon,
  iconClass,
  active,
}: {
  href: string
  label: string
  value: number | null | undefined
  icon: LucideIcon
  iconClass: string
  active: boolean
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-full min-h-24 flex-col justify-between gap-3 rounded-2xl border bg-surface-raised p-3.5 shadow-tactile transition-shadow outline-none hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-4",
          active ? "border-olive ring-1 ring-olive" : "border-olive-line",
        )}
      >
        <span className="flex items-start justify-between gap-2">
          <span className="text-xs leading-tight font-semibold text-olive-muted sm:text-sm">{label}</span>
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-xl", iconClass)}>
            <Icon aria-hidden className="size-4" />
          </span>
        </span>
        <span className={cn("font-heading leading-none font-extrabold text-olive", value == null ? "text-sm" : "text-3xl")}>
          {value == null ? "No disponible" : value}
        </span>
      </Link>
    </li>
  )
}

function ReservationListCard({ item, href, selected }: { item: ReservationListItem; href: string; selected: boolean }) {
  const tone = statusTone[item.status]
  return (
    <Link
      href={href}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "relative flex items-stretch gap-3 overflow-hidden rounded-2xl border bg-surface-raised p-3 pl-4 shadow-tactile transition-shadow outline-none hover:shadow-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        selected ? "border-olive ring-1 ring-olive" : "border-olive-line",
      )}
    >
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", toneBar[tone])} />
      <span className="flex w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-cream py-2 text-center">
        <span className="font-heading text-lg leading-none font-extrabold text-olive">{item.preferredTime}</span>
        <span className="mt-1 text-[0.6875rem] leading-tight text-olive-muted capitalize">{shortDate(item.date)}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
        <span className="flex min-w-0 items-baseline justify-between gap-2">
          <span className="truncate font-heading text-base leading-tight font-bold text-olive">{item.customerName}</span>
          <span className="shrink-0 font-label text-[0.6875rem] tracking-wide text-olive-muted">{item.referenceCode}</span>
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-olive-strong">
          <ReservationStatusBadge status={item.status} label={statusLabel[item.status]} />
          <span className="inline-flex items-center gap-1">
            <Users aria-hidden className="size-3.5 text-olive-muted" />
            {item.partySize}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin aria-hidden className="size-3.5 text-olive-muted" />
            {zoneConfig(item.preferredZone).label}
          </span>
        </span>
      </span>
      <ChevronRight aria-hidden className="size-4 shrink-0 self-center text-olive-soft" />
    </Link>
  )
}

function DetailSection({ icon: Icon, title, children, aside }: { icon: LucideIcon; title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-olive-line px-4 py-4 sm:px-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-label text-[0.6875rem] font-semibold tracking-[0.14em] text-olive-muted uppercase">
          <Icon aria-hidden className="size-4" />
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  )
}

function DetailFact({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn("min-w-0 rounded-xl bg-cream px-3 py-2.5", wide && "col-span-2")}>
      <dt className="text-[0.6875rem] text-olive-muted">{label}</dt>
      <dd className="truncate font-heading text-base font-bold text-olive">{value}</dd>
    </div>
  )
}

function ReservationHistory({ events, actionLabel }: { events: ReservationEvent[]; actionLabel: Record<string, string> }) {
  if (events.length === 0) return <p className="text-sm text-olive-muted">Sin movimientos.</p>
  return (
    <ol className="flex flex-col">
      {events.map((event, index) => (
        <li key={`${event.at}-${index}`} className="relative flex gap-3 pb-4 last:pb-0">
          {index < events.length - 1 ? <span aria-hidden className="absolute top-4 bottom-0 left-[0.3125rem] w-px bg-olive-line" /> : null}
          <span aria-hidden className={cn("relative mt-1.5 size-2.5 shrink-0 rounded-full ring-4", toneDot[statusTone[event.toStatus]])} />
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-olive">
              {actionLabel[event.action] ?? event.action}
              <span className="font-normal text-olive-muted"> · {statusLabel[event.toStatus]}</span>
            </p>
            <p className="text-xs break-all text-olive-muted">
              {event.at.slice(0, 16).replace("T", " ")}
              {event.fromStatus ? ` · antes: ${statusLabel[event.fromStatus]}` : ""}
              {event.actorUid ? ` · ${event.actorUid}` : ""}
            </p>
            {event.reason ? <p className="mt-1 text-olive-strong">«{event.reason}»</p> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}

export { DetailFact, DetailSection, ReservationHistory, ReservationListCard, SummaryTile, shortDate }
