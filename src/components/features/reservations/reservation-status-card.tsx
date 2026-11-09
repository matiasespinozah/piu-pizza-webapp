import { Ban, CalendarCheck, CalendarClock, Check, CircleCheck, Clock, MapPin, RefreshCw, XCircle, type LucideIcon } from "lucide-react"
import { cn } from "cn"

import { ReservationReference } from "@/components/features/reservations/reservation-tracking-actions"
import { ReservationVisitFacts } from "@/components/features/reservations/reservation-visit-facts"
import { Button } from "@/components/ui/button"
import { zoneConfig } from "@/lib/reservations/configuration"
import { formatVisitDate } from "@/lib/reservations/schedule"
import type { PublicReservationStatus } from "@/lib/reservations/tracking-link"
import type { ReservationStatus } from "@/lib/reservations/types"
import { directionsUrl } from "@/lib/site"

type Tone = "waiting" | "good" | "closed"

const presentation: Record<ReservationStatus, { label: string; message: string; icon: LucideIcon; tone: Tone }> = {
  pending: { label: "Pendiente", message: "Estamos revisando tu solicitud. Te avisamos pronto.", icon: Clock, tone: "waiting" },
  reschedule_requested: {
    label: "Cambio propuesto",
    message: "Te proponemos otro horario. Escríbenos para coordinarlo.",
    icon: CalendarClock,
    tone: "waiting",
  },
  confirmed: { label: "Confirmada", message: "¡Tu mesa te espera! Nos vemos pronto.", icon: CalendarCheck, tone: "good" },
  arrived: { label: "En PIÙ", message: "Ya estás con nosotros. ¡Buen provecho!", icon: MapPin, tone: "good" },
  completed: { label: "Finalizada", message: "Gracias por visitarnos. Vuelve cuando quieras.", icon: CircleCheck, tone: "good" },
  rejected: { label: "No confirmada", message: "Esta vez no pudimos darte mesa. Prueba con otro horario.", icon: XCircle, tone: "closed" },
  cancelled: { label: "Cancelada", message: "Esta reserva ya no está vigente.", icon: Ban, tone: "closed" },
}

const steps = ["Recibida", "Confirmada", "En PIÙ"] as const

function stepOf(status: ReservationStatus) {
  if (status === "confirmed") return 1
  if (status === "arrived") return 2
  if (status === "completed") return 3
  return 0
}

function whatsappHref(reference: string) {
  return `https://wa.me/56928873619?text=${encodeURIComponent(`Hola, quiero consultar mi solicitud ${reference} en PIÙ.`)}`
}

function Progress({ status }: { status: ReservationStatus }) {
  const current = stepOf(status)
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Avance de la reserva">
      {steps.map((label, index) => {
        const done = index < current || (index === current && current > 0)
        const active = index === current && !done
        return (
          <li key={label} className="flex flex-col gap-2" aria-current={active ? "step" : undefined}>
            <span
              className={cn(
                "reservation-progress-bar h-1.5 rounded-full",
                done ? "bg-olive" : active ? "reservation-progress-active bg-terracotta" : "bg-olive-line",
              )}
            />
            <span className={cn("text-xs", done || active ? "font-semibold text-olive" : "text-olive-muted")}>{label}</span>
          </li>
        )
      })}
    </ol>
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
  const proposalText = proposal
    ? [proposal.date ? formatVisitDate(proposal.date) : null, proposal.time, proposal.zone ? zoneConfig(proposal.zone).label : null]
        .filter(Boolean)
        .join(" · ")
    : ""

  return (
    <article className="reservation-status-in flex flex-col gap-5 rounded-3xl border border-olive-line bg-surface-raised px-5 py-6 shadow-lift sm:px-7" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-full",
              view.tone === "good" && "bg-olive text-cream",
              view.tone === "waiting" && "bg-terracotta text-cream",
              view.tone === "closed" && "bg-olive-hover text-olive",
            )}
          >
            <Icon aria-hidden className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="font-label text-[0.6875rem] tracking-[0.14em] text-olive-muted uppercase">Estado</p>
            <h2 className="font-heading text-2xl leading-tight font-extrabold text-olive">{view.label}</h2>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Actualizar estado"
          aria-busy={refreshing}
          disabled={refreshing}
          onClick={onRefresh}
        >
          <RefreshCw aria-hidden className={cn("size-5", refreshing && "animate-spin motion-reduce:animate-none")} />
        </Button>
      </div>

      <p className="text-base text-olive-strong">{view.message}</p>

      {view.tone !== "closed" ? <Progress status={status.status} /> : null}

      {proposal ? (
        <div className="flex items-start gap-3 rounded-2xl bg-olive-hover px-4 py-3">
          <CalendarClock aria-hidden className="mt-0.5 size-5 shrink-0 text-terracotta" />
          <div className="min-w-0">
            <p className="text-xs text-olive-muted">Nuevo horario propuesto</p>
            <p className="font-semibold text-olive">{proposalText || "Te contamos el horario por WhatsApp."}</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <ReservationReference code={status.referenceCode} size="md" />
        <ReservationVisitFacts visit={{ date: status.date, time: status.time, partySize: status.partySize, zone: status.zone }} />
      </div>

      <StatusActions status={status} />

      <p className="flex items-center justify-center gap-1.5 text-xs text-olive-muted" aria-live="polite">
        {refreshError ? (
          refreshError
        ) : (
          <>
            <Check aria-hidden className="size-3.5" />
            Actualizado a las {checkedAt}
          </>
        )}
      </p>
    </article>
  )
}

function StatusActions({ status }: { status: PublicReservationStatus }) {
  const whatsapp = (
    <a href={whatsappHref(status.referenceCode)} target="_blank" rel="noopener noreferrer">
      Escribir por WhatsApp
    </a>
  )

  if (status.status === "confirmed") {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button asChild variant="accent" size="lg" className="w-full">
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
            Cómo llegar
          </a>
        </Button>
        <Button asChild variant="secondary" size="lg" className="w-full">
          {whatsapp}
        </Button>
      </div>
    )
  }

  if (status.status === "rejected" || status.status === "cancelled" || status.status === "completed") {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button asChild variant="accent" size="lg" className="w-full">
          <a href="/reservas">{status.status === "completed" ? "Reservar otra vez" : "Nueva solicitud"}</a>
        </Button>
        <Button asChild variant="secondary" size="lg" className="w-full">
          {whatsapp}
        </Button>
      </div>
    )
  }

  if (status.status === "arrived") {
    return (
      <Button asChild variant="accent" size="lg" className="w-full">
        <a href="/carta">Ver la carta</a>
      </Button>
    )
  }

  return (
    <Button asChild variant={status.status === "reschedule_requested" ? "accent" : "secondary"} size="lg" className="w-full">
      {whatsapp}
    </Button>
  )
}

export { ReservationStatusCard }
