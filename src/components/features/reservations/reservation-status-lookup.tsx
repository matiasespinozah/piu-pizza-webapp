"use client"

import { Ticket } from "lucide-react"

import { ReservationCodeForm } from "@/components/features/reservations/reservation-code-form"
import { reservationStatusWhatsappMessage } from "@/lib/reservations/configuration"

const whatsappHref = `https://wa.me/56928873619?text=${encodeURIComponent(reservationStatusWhatsappMessage)}`

function ReservationStatusLookup({
  error,
  pending,
  onCode,
}: {
  error: string
  pending: boolean
  onCode: (code: string) => void
}) {
  return (
    <div className="reservation-status-in flex flex-col gap-4 rounded-[1.75rem] border border-olive-line bg-surface-raised px-5 py-6 shadow-lift sm:px-7">
      <div className="flex items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-olive text-cream shadow-lift">
          <Ticket aria-hidden className="size-7" />
        </span>
        <div className="min-w-0">
          <h2 className="font-heading text-xl leading-tight font-bold text-olive">Consulta tu reserva</h2>
          <p className="mt-1 text-sm text-olive-muted">Escribe el código. PIU- ya está puesto.</p>
        </div>
      </div>
      <ReservationCodeForm error={error} pending={pending} onCode={onCode} />
      <p className="text-center text-sm text-olive-muted">
        ¿No lo tienes?{" "}
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-olive underline underline-offset-4">
          Escríbenos por WhatsApp
        </a>
      </p>
    </div>
  )
}

export { ReservationStatusLookup }
