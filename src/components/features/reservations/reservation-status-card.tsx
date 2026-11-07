import { Ban, CalendarCheck, CalendarClock, CircleCheck, Clock, Info, MapPin, type LucideIcon } from "lucide-react"

import { reservationStatusWhatsappMessage, zoneConfig } from "@/lib/reservations/configuration"
import { formatVisitDate } from "@/lib/reservations/schedule"
import type { PublicReservationStatus } from "@/lib/reservations/tracking-link"
import type { ReservationStatus } from "@/lib/reservations/types"
import { Button } from "@/components/ui/button"

const presentation: Record<ReservationStatus, { title: string; description: string; icon: LucideIcon }> = {
  pending: {
    title: "Solicitud recibida",
    description: "El equipo de PIÙ todavía está revisando tu solicitud.",
    icon: Clock,
  },
  confirmed: {
    title: "¡Tu reserva está confirmada!",
    description: "El equipo de PIÙ confirmó tu mesa para esta visita.",
    icon: CalendarCheck,
  },
  rejected: {
    title: "No pudimos confirmar tu reserva",
    description: "Puedes escribirnos por WhatsApp o enviar otra solicitud.",
    icon: Info,
  },
  reschedule_requested: {
    title: "PIÙ propone un cambio",
    description: "El cambio todavía necesita resolverse. Escríbenos si quieres comentarlo.",
    icon: CalendarClock,
  },
  cancelled: {
    title: "Reserva cancelada",
    description: "Esta reserva ya no está vigente.",
    icon: Ban,
  },
  arrived: {
    title: "Registramos tu llegada",
    description: "El equipo de PIÙ marcó que ya llegaste.",
    icon: MapPin,
  },
  completed: {
    title: "Visita finalizada",
    description: "Esta visita ya terminó.",
    icon: CircleCheck,
  },
}

function updatedLabel(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function whatsappHref(reference: string) {
  const text = `Hola, quiero consultar mi solicitud ${reference} en PIÙ.`
  return `https://wa.me/56928873619?text=${encodeURIComponent(text || reservationStatusWhatsappMessage)}`
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-olive-muted">{label}</dt>
      <dd className="font-semibold break-words">{value}</dd>
    </div>
  )
}

function ReservationStatusCard({
  status,
  checkedAt,
  refreshing,
  refreshError,
  onRefresh,
}: {
  status: PublicReservationStatus
  checkedAt: string
  refreshing: boolean
  refreshError: string
  onRefresh: () => void
}) {
  const view = presentation[status.status]
  const Icon = view.icon
  const proposal = status.proposal
  const updated = status.updatedAt ? updatedLabel(status.updatedAt) : ""

  return (
    <article className="rounded-3xl border border-olive-line bg-surface-raised px-4 py-6 shadow-lift" aria-live="polite">
      <div className="flex items-start gap-3">
        <Icon aria-hidden="true" className="mt-1 size-7 shrink-0 text-olive" />
        <div className="min-w-0">
          <h2 className="font-heading text-2xl font-bold text-olive">{view.title}</h2>
          <p className="mt-2 text-base text-olive-strong">{view.description}</p>
          {status.status === "pending" ? <p className="mt-2 text-sm font-semibold text-olive">Tu mesa todavía no está confirmada.</p> : null}
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <Fact label="Fecha" value={formatVisitDate(status.date)} />
        <Fact label="Horario" value={status.time} />
        <Fact label="Personas" value={String(status.partySize)} />
        <Fact label="Zona" value={zoneConfig(status.zone).label} />
        <div className="sm:col-span-2">
          <Fact label="Solicitud" value={status.referenceCode} />
        </div>
        {proposal ? (
          <div className="sm:col-span-2">
            <Fact
              label="Cambio propuesto"
              value={[
                proposal.date ? formatVisitDate(proposal.date) : null,
                proposal.time,
                proposal.zone ? zoneConfig(proposal.zone).label : null,
              ]
                .filter(Boolean)
                .join(" · ") || "El equipo todavía no indica el nuevo horario."}
            />
          </div>
        ) : null}
      </dl>
      <p className="mt-4 text-sm text-olive-muted">Última consulta a las {checkedAt}.</p>
      {updated ? <p className="text-sm text-olive-muted">El restaurante actualizó esta solicitud el {updated}.</p> : null}
      {refreshError ? <p className="mt-3 text-sm text-olive-strong">{refreshError}</p> : null}
      <Button type="button" variant="secondary" className="mt-4 h-12 w-full" aria-busy={refreshing} disabled={refreshing} onClick={onRefresh}>
        {refreshing ? "Consultando…" : "Actualizar estado"}
      </Button>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button asChild variant="accent" className="h-12 w-full">
          <a href={whatsappHref(status.referenceCode)} target="_blank" rel="noopener noreferrer">
            Escribir por WhatsApp
          </a>
        </Button>
        <Button asChild variant="secondary" className="h-12 w-full">
          <a href="/reservas">Volver a reservas</a>
        </Button>
      </div>
    </article>
  )
}

export { ReservationStatusCard }
