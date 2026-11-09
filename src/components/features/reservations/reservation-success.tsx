"use client"

import { useState } from "react"
import { Check } from "lucide-react"

import { CopyTrackingLink, ReservationReference } from "@/components/features/reservations/reservation-tracking-actions"
import { ReservationVisitFacts } from "@/components/features/reservations/reservation-visit-facts"
import { Button } from "@/components/ui/button"
import type { PublicReceipt } from "@/lib/reservations/views"

const pieceCount = 26

function ReservationConfetti() {
  const [pieces] = useState(() =>
    Array.from({ length: pieceCount }, (_, index) => {
      const tone = index % 3
      return {
        id: index,
        left: `${3 + ((index * 37) % 94)}%`,
        delay: `${(index % 9) * 60}ms`,
        duration: `${1900 + (index % 5) * 170}ms`,
        drift: `${index % 2 === 0 ? -14 - (index % 5) * 6 : 12 + (index % 4) * 7}px`,
        spin: `${index % 2 === 0 ? 140 + index * 7 : -160 - index * 5}deg`,
        width: index % 4 === 0 ? 6 : 4,
        height: index % 3 === 0 ? 10 : 7,
        round: index % 5 === 0,
        color: tone === 0 ? "var(--brand-olive)" : tone === 1 ? "var(--brand-terracotta)" : "var(--terracotta-soft)",
      }
    }),
  )

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-72 overflow-hidden">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="reservation-confetti-piece absolute top-0 block"
          style={{
            left: piece.left,
            width: piece.width,
            height: piece.height,
            borderRadius: piece.round ? 999 : 1.5,
            background: piece.color,
            animationDelay: piece.delay,
            animationDuration: piece.duration,
            ["--drift" as string]: piece.drift,
            ["--spin" as string]: piece.spin,
          }}
        />
      ))}
    </div>
  )
}

function ReservationSuccess({
  receipt,
  trackingToken,
  whatsappHref,
}: {
  receipt: PublicReceipt
  trackingToken: string | null
  whatsappHref: string
}) {
  return (
    <section
      aria-labelledby="reservation-success-title"
      className="relative overflow-hidden rounded-3xl border border-olive-line bg-surface-raised px-5 pt-8 pb-5 shadow-lift sm:px-7"
    >
      <ReservationConfetti />
      <div className="relative flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="reservation-success-badge relative flex size-16 items-center justify-center rounded-full bg-olive text-cream">
            <span aria-hidden className="reservation-success-ring absolute inset-0 rounded-full border-2 border-olive" />
            <Check aria-hidden className="reservation-success-check size-8" strokeWidth={2.5} />
          </span>
          <div className="reservation-success-copy flex flex-col gap-1" aria-live="polite">
            <h2 id="reservation-success-title" className="font-heading text-[1.75rem] leading-tight font-extrabold text-olive">
              ¡Solicitud recibida!
            </h2>
            <p className="text-base text-olive-strong">Estamos revisando tu reserva.</p>
          </div>
        </div>

        <div className="reservation-success-copy flex flex-col gap-3">
          <ReservationReference code={receipt.referenceCode} />
          <ReservationVisitFacts
            visit={{ date: receipt.date, time: receipt.preferredTime, partySize: receipt.partySize, zone: receipt.preferredZone }}
          />
        </div>

        <div className="reservation-success-copy">
          {trackingToken ? (
            <CopyTrackingLink token={trackingToken} />
          ) : (
            <Button asChild variant="accent" size="lg" className="w-full">
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                Escribir por WhatsApp
              </a>
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-olive-muted">Tu mesa queda confirmada cuando PIÙ apruebe la solicitud.</p>
      </div>
    </section>
  )
}

export { ReservationSuccess }
