import { CalendarCheck, CalendarClock, Check, Inbox, MessageCircle, Navigation, RefreshCw, UtensilsCrossed, type LucideIcon } from "lucide-react"
import { cn } from "cn"

import { statusIcon } from "@/components/features/reservations/reservation-status-badge"
import { ReservationReference } from "@/components/features/reservations/reservation-tracking-actions"
import { ReservationVisitFacts } from "@/components/features/reservations/reservation-visit-facts"
import { Button } from "@/components/ui/button"
import { zoneConfig } from "@/lib/reservations/configuration"
import { formatVisitDate } from "@/lib/reservations/schedule"
import { statusTone, toneSolidClass, type StatusTone } from "@/lib/reservations/status-tone"
import type { PublicReservationStatus } from "@/lib/reservations/tracking-link"
import type { ReservationStatus } from "@/lib/reservations/types"
import { directionsUrl } from "@/lib/site"

const presentation: Record<ReservationStatus, { label: string; message: string }> = {
  pending: { label: "Pendiente", message: "Estamos revisando tu solicitud. Te avisamos pronto." },
  reschedule_requested: { label: "Cambio propuesto", message: "Te proponemos otro horario. Escríbenos para coordinarlo." },
  confirmed: { label: "Confirmada", message: "¡Tu mesa te espera! Nos vemos pronto." },
  arrived: { label: "En PIÙ", message: "Ya estás con nosotros. ¡Buen provecho!" },
  completed: { label: "Finalizada", message: "Gracias por visitarnos. Vuelve cuando quieras." },
  rejected: { label: "No confirmada", message: "Esta vez no pudimos darte mesa. Prueba con otro horario." },
  cancelled: { label: "Cancelada", message: "Esta reserva ya no está vigente." },
}

const heroClass: Record<StatusTone, string> = {
  waiting: "bg-status-waiting-soft/70",
  good: "bg-status-good-soft/80",
  done: "bg-status-good-soft",
  rejected: "bg-status-closed-soft/80",
  neutral: "bg-olive-hover",
}

type Step = { label: string; icon: LucideIcon; reached: string }

/** Cada paso tiene su propio color: ámbar al recibir, verde al confirmar y verde fuerte con check en PIÙ. */
const steps: Step[] = [
  { label: "Recibida", icon: Inbox, reached: "bg-status-waiting-solid text-olive" },
  { label: "Confirmada", icon: CalendarCheck, reached: "bg-status-good-solid text-cream" },
  { label: "En PIÙ", icon: Check, reached: "bg-status-done-solid text-cream" },
]

const connectorClass = ["bg-status-good-solid", "bg-status-done-solid"]

function stepOf(status: ReservationStatus) {
  if (status === "confirmed") return 1
  if (status === "arrived" || status === "completed") return 2
  return 0
}

function whatsappHref(reference: string) {
  return `https://wa.me/56928873619?text=${encodeURIComponent(`Hola, quiero consultar mi solicitud ${reference} en PIÙ.`)}`
}

function Stepper({ status }: { status: ReservationStatus }) {
  const current = stepOf(status)
  const finished = status === "completed"
  return (
    <ol className="flex items-start" aria-label="Avance de la reserva">
      {steps.map((step, index) => {
        const reached = index <= current
        const active = index === current && !finished
        const Icon = step.icon
        return (
          <li key={step.label} className="relative flex flex-1 flex-col items-center gap-2" aria-current={active ? "step" : undefined}>
            {index > 0 ? (
              <span
                aria-hidden
                className={cn(
                  "absolute top-6 right-[calc(50%+1.75rem)] left-[calc(-50%+1.75rem)] h-1 -translate-y-1/2 rounded-full",
                  reached ? connectorClass[index - 1] : "bg-olive-line",
                )}
              />
            ) : null}
            <span className="relative flex size-12 items-center justify-center">
              {active ? (
                <span
                  aria-hidden
                  className={cn("reservation-step-halo absolute inset-0 rounded-full", step.reached.split(" ")[0])}
                />
              ) : null}
              <span
                className={cn(
                  "relative flex size-12 items-center justify-center rounded-full transition-colors",
                  reached ? cn(step.reached, "shadow-tactile") : "border-2 border-dashed border-olive-line text-olive-soft",
                  reached && index === 2 && "reservation-step-done",
                )}
              >
                <Icon aria-hidden className={index === 2 && reached ? "size-6" : "size-5"} strokeWidth={index === 2 ? 3 : 2.2} />
              </span>
            </span>
            <span className={cn("text-center text-xs leading-tight sm:text-sm", reached ? "font-semibold text-olive" : "text-olive-muted")}>
              {step.label}
              <span className="sr-only">{reached ? (active ? ", paso actual" : ", listo") : ", pendiente"}</span>
            </span>
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
  const tone = statusTone[status.status]
  const Icon = statusIcon[status.status]
  const closed = tone === "rejected" || tone === "neutral"
  const proposal = status.proposal
  const proposalText = proposal
    ? [proposal.date ? formatVisitDate(proposal.date) : null, proposal.time, proposal.zone ? zoneConfig(proposal.zone).label : null]
        .filter(Boolean)
        .join(" · ")
    : ""

  return (
    <article
      className="reservation-status-in overflow-hidden rounded-[1.75rem] border border-olive-line bg-surface-raised shadow-lift"
      aria-live="polite"
    >
      <header className={cn("relative flex flex-col gap-4 px-5 pt-5 pb-6 sm:px-7", heroClass[tone])}>
        <div className="flex items-center justify-between gap-3">
          <p className="font-label text-[0.6875rem] font-semibold tracking-[0.16em] text-olive-muted uppercase">Estado de tu reserva</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full bg-cream/60 hover:bg-cream"
            aria-label="Actualizar estado"
            aria-busy={refreshing}
            disabled={refreshing}
            onClick={onRefresh}
          >
            <RefreshCw aria-hidden className={cn("size-5", refreshing && "animate-spin motion-reduce:animate-none")} />
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <span
            className={cn(
              "reservation-status-icon flex size-16 shrink-0 items-center justify-center rounded-2xl shadow-lift",
              toneSolidClass[tone],
            )}
          >
            <Icon aria-hidden className="size-8" strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <h2 className="font-heading text-[2rem] leading-none font-extrabold tracking-tight text-olive">{view.label}</h2>
            <p className="mt-2 text-[0.9375rem] leading-snug text-olive-strong">{view.message}</p>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-5 px-5 py-6 sm:px-7">
        {closed ? null : <Stepper status={status.status} />}

        {proposal ? (
          <div className="flex items-start gap-3 rounded-2xl border border-status-waiting-solid/40 bg-status-waiting-soft/50 px-4 py-3">
            <CalendarClock aria-hidden className="mt-0.5 size-5 shrink-0 text-status-waiting" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-status-waiting">Nuevo horario propuesto</p>
              <p className="font-heading text-base font-bold text-olive">{proposalText || "Te contamos el horario por WhatsApp."}</p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
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
      </div>
    </article>
  )
}

function StatusActions({ status }: { status: PublicReservationStatus }) {
  const whatsapp = (
    <a href={whatsappHref(status.referenceCode)} target="_blank" rel="noopener noreferrer">
      <MessageCircle aria-hidden />
      Escribir por WhatsApp
    </a>
  )
  const menu = (
    <a href="/carta">
      <UtensilsCrossed aria-hidden />
      Ver la carta
    </a>
  )
  const primary = "h-14 w-full text-base shadow-lift"

  if (status.status === "confirmed") {
    return (
      <div className="flex flex-col gap-2">
        <Button asChild variant="accent" size="lg" className={primary}>
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
            <Navigation aria-hidden />
            Cómo llegar
          </a>
        </Button>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button asChild variant="secondary" size="lg" className="w-full">
            {menu}
          </Button>
          <Button asChild variant="secondary" size="lg" className="w-full">
            {whatsapp}
          </Button>
        </div>
      </div>
    )
  }

  if (status.status === "rejected" || status.status === "cancelled" || status.status === "completed") {
    return (
      <div className="flex flex-col gap-2">
        <Button asChild variant="accent" size="lg" className={primary}>
          <a href="/reservas">{status.status === "completed" ? "Reservar otra vez" : "Nueva solicitud"}</a>
        </Button>
        <Button asChild variant="secondary" size="lg" className="w-full">
          {whatsapp}
        </Button>
      </div>
    )
  }

  if (status.status === "reschedule_requested") {
    return (
      <div className="flex flex-col gap-2">
        <Button asChild variant="accent" size="lg" className={primary}>
          {whatsapp}
        </Button>
        <Button asChild variant="secondary" size="lg" className="w-full">
          {menu}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Button asChild variant="accent" size="lg" className={primary}>
        {menu}
      </Button>
      {status.status === "pending" ? (
        <Button asChild variant="secondary" size="lg" className="w-full">
          {whatsapp}
        </Button>
      ) : null}
    </div>
  )
}

export { ReservationStatusCard }
