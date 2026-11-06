"use client"

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react"

import { ReservationContactStep } from "@/components/features/reservations/reservation-contact-step"
import { ReservationDateStep } from "@/components/features/reservations/reservation-date-step"
import { ReservationProgress } from "@/components/features/reservations/reservation-progress"
import { ReservationSummary } from "@/components/features/reservations/reservation-summary"
import { ReservationTimeStep } from "@/components/features/reservations/reservation-time-step"
import { Button } from "@/components/ui/button"
import { reservationWhatsappMessage } from "@/lib/reservations/configuration"
import { todayIsoInSantiago } from "@/lib/reservations/schedule"
import { normalizeChileMobile, validateTime, validateVisit } from "@/lib/reservations/validation"
import type { ReservationDraft, ReservationErrors, ReservationStep } from "@/lib/reservations/types"

const whatsappHref = `https://wa.me/56928873619?text=${encodeURIComponent(reservationWhatsappMessage)}`

const initialDraft: ReservationDraft = {
  date: "",
  partySize: 2,
  zone: null,
  preferredTime: "",
  customerName: "",
  customerPhone: "",
  notes: "",
}

const stepTitle = {
  1: "Tu visita",
  2: "Horario",
  3: "Tus datos",
} as const

function ReservationForm() {
  const [step, setStep] = useState<ReservationStep>(1)
  const [draft, setDraft] = useState<ReservationDraft>(initialDraft)
  const [errors, setErrors] = useState<ReservationErrors>({})
  const today = useSyncExternalStore(
    () => () => {},
    todayIsoInSantiago,
    () => ""
  )
  const headingRef = useRef<HTMLHeadingElement>(null)
  const titleId = useId()
  const preview = process.env.NODE_ENV !== "production"

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [step])

  function patch(next: Partial<ReservationDraft>) {
    setDraft((current) => ({ ...current, ...next }))
    const keys = Object.keys(next) as (keyof ReservationErrors)[]
    setErrors((current) => {
      const cleared = { ...current }
      for (const key of keys) delete cleared[key]
      return cleared
    })
  }

  function goNext() {
    const nextErrors = step === 1 ? validateVisit(draft) : validateTime(draft)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setStep((current) => (current === 1 ? 2 : 3))
  }

  function goBack() {
    setErrors({})
    setStep((current) => (current === 3 ? 2 : 1))
  }

  function edit(target: ReservationStep) {
    setErrors({})
    setStep(target)
  }

  const phone = normalizeChileMobile(draft.customerPhone) ?? ""

  return (
    <form
      data-reservation-form=""
      data-reservation-step={step}
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
      }}
    >
      <ReservationProgress step={step} onSelect={edit} />

      <section
        aria-labelledby={titleId}
        className="reservation-step rounded-3xl border border-olive-line bg-surface-raised px-4 py-5 shadow-lift"
      >
        <h2 id={titleId} ref={headingRef} tabIndex={-1} className="sr-only">
          {stepTitle[step]}
        </h2>
        {preview ? (
          <p className="mb-4 inline-flex rounded-full bg-terracotta px-3 py-1 font-label text-xs font-semibold tracking-wide text-cream">
            Vista previa
          </p>
        ) : (
          <p className="mb-4 text-sm text-olive-strong">Las reservas en línea aún no están disponibles.</p>
        )}
        {step === 1 ? <ReservationDateStep draft={draft} errors={errors} today={today} onChange={patch} /> : null}
        {step === 2 ? (
          <ReservationTimeStep draft={draft} errors={errors} onChange={(preferredTime) => patch({ preferredTime })} />
        ) : null}
        {step === 3 ? (
          <div className="flex flex-col gap-5">
            <ReservationSummary draft={draft} phone={phone} />
            <ReservationContactStep draft={draft} errors={errors} onChange={patch} />
          </div>
        ) : null}
      </section>

      <div className="sticky bottom-3 z-20 flex items-center gap-3">
        {step > 1 ? (
          <Button type="button" variant="secondary" size="lg" className="h-12 min-w-28 bg-cream" onClick={goBack}>
            Volver
          </Button>
        ) : null}
        {step < 3 ? (
          <Button type="button" variant="accent" size="lg" className="h-12 flex-1" onClick={goNext}>
            Continuar
          </Button>
        ) : (
          <Button type="button" variant="accent" size="lg" className="h-12 flex-1" disabled>
            Enviar solicitud
          </Button>
        )}
      </div>

      {step === 3 ? (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="self-center text-sm font-semibold text-olive underline decoration-terracotta underline-offset-4 outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring"
        >
          ¿Necesitas ayuda?
        </a>
      ) : null}
    </form>
  )
}

export { ReservationForm }
