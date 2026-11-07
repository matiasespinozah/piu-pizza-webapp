"use client"

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react"

import { ReservationContactStep } from "@/components/features/reservations/reservation-contact-step"
import { ReservationDateStep } from "@/components/features/reservations/reservation-date-step"
import { ReservationProgress } from "@/components/features/reservations/reservation-progress"
import { ReservationSummary } from "@/components/features/reservations/reservation-summary"
import { ReservationTimeStep } from "@/components/features/reservations/reservation-time-step"
import { CopyTrackingLink } from "@/components/features/reservations/reservation-tracking-actions"
import { Button } from "@/components/ui/button"
import { reservationWhatsappMessage, zoneConfig } from "@/lib/reservations/configuration"
import { formatVisitDate, todayIsoInSantiago } from "@/lib/reservations/schedule"
import { normalizeChileMobile, validateContact, validateTime, validateVisit } from "@/lib/reservations/validation"
import type { PublicReceipt } from "@/lib/reservations/views"
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

function ReservationForm({ receptionEnabled }: { receptionEnabled: boolean }) {
  const [step, setStep] = useState<ReservationStep>(1)
  const [draft, setDraft] = useState<ReservationDraft>(initialDraft)
  const [errors, setErrors] = useState<ReservationErrors>({})
  const [sending, setSending] = useState(false)
  const [formError, setFormError] = useState("")
  const [receipt, setReceipt] = useState<PublicReceipt | null>(null)
  const [trackingToken, setTrackingToken] = useState<string | null>(null)
  const requestKey = useRef<string | null>(null)
  const today = useSyncExternalStore(
    () => () => {},
    todayIsoInSantiago,
    () => ""
  )
  const headingRef = useRef<HTMLHeadingElement>(null)
  const titleId = useId()

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
    headingRef.current?.focus({ preventScroll: true })
  }

  function goBack() {
    setErrors({})
    setStep((current) => (current === 3 ? 2 : 1))
  }

  function edit(target: ReservationStep) {
    setErrors({})
    setStep(target)
  }

  async function send() {
    if (!receptionEnabled || sending) return
    const nextErrors = validateContact(draft)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    if (!requestKey.current) requestKey.current = crypto.randomUUID()
    setSending(true)
    setFormError("")
    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: requestKey.current,
          date: draft.date,
          preferredTime: draft.preferredTime,
          partySize: draft.partySize,
          preferredZone: draft.zone,
          customerName: draft.customerName,
          customerPhone: draft.customerPhone,
          notes: draft.notes,
        }),
      })
      const body = (await response.json().catch(() => null)) as { request?: PublicReceipt; message?: string; trackingToken?: string | null } | null
      if ((response.status === 201 || response.status === 200) && body?.request?.status === "pending") {
        setReceipt(body.request)
        setTrackingToken(typeof body.trackingToken === "string" ? body.trackingToken : null)
        return
      }
      setFormError(body?.message || "No se pudo enviar la solicitud.")
    } catch {
      setFormError("No pudimos saber si se envió. Si lo intentas otra vez, no se creará una segunda solicitud.")
    } finally {
      setSending(false)
    }
  }

  const phone = normalizeChileMobile(draft.customerPhone) ?? ""

  if (!receptionEnabled) {
    return (
      <section
        data-reservation-form=""
        data-reservation-enabled="off"
        className="rounded-3xl border border-olive-line bg-surface-raised px-4 py-6 shadow-lift"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} ref={headingRef} tabIndex={-1} className="font-heading text-2xl font-bold text-olive">
          Las reservas en línea aún no están disponibles
        </h2>
        <p className="mt-3 text-base text-olive-strong">
          Por ahora no puedes enviar una solicitud por aquí. Escríbenos por WhatsApp y te ayudamos a pedir una mesa.
        </p>
        <Button asChild variant="accent" size="lg" className="mt-5 h-12 w-full">
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
            Escribir por WhatsApp
          </a>
        </Button>
      </section>
    )
  }

  if (receipt) {
    return (
      <section className="rounded-3xl border border-olive-line bg-surface-raised px-4 py-6 shadow-lift" aria-live="polite">
        <h2 className="font-heading text-2xl font-bold text-olive">¡Recibimos tu solicitud!</h2>
        <p className="mt-3 text-base text-olive-strong">
          El equipo de PIÙ revisará tu solicitud. Tu mesa todavía no está confirmada.
        </p>
        <dl className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-olive-muted">Fecha</dt>
            <dd className="font-semibold">{formatVisitDate(receipt.date)}</dd>
          </div>
          <div>
            <dt className="text-olive-muted">Horario</dt>
            <dd className="font-semibold">{receipt.preferredTime}</dd>
          </div>
          <div>
            <dt className="text-olive-muted">Personas</dt>
            <dd className="font-semibold">{receipt.partySize}</dd>
          </div>
          <div>
            <dt className="text-olive-muted">Zona</dt>
            <dd className="font-semibold">{zoneConfig(receipt.preferredZone).label}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-olive-muted">Solicitud</dt>
            <dd className="font-label font-semibold">{receipt.referenceCode}</dd>
          </div>
        </dl>
        <div className="mt-5">
          {trackingToken ? (
            <CopyTrackingLink token={trackingToken} />
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-olive-strong">
                No pudimos entregar el enlace de seguimiento. Anota la referencia {receipt.referenceCode} y escríbenos para que el equipo te ayude.
              </p>
              <Button asChild variant="accent" className="h-12 w-full">
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                  Escribir por WhatsApp
                </a>
              </Button>
            </div>
          )}
        </div>
      </section>
    )
  }

  return (
    <form
      data-reservation-form=""
      data-reservation-step={step}
      data-reservation-enabled={receptionEnabled ? "on" : "off"}
      method="post"
      action="/reservas"
      className="flex w-full min-w-0 flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        if (step < 3) goNext()
        else void send()
      }}
    >
      <ReservationProgress step={step} onSelect={edit} />

      <section
        aria-labelledby={titleId}
        className="reservation-step min-w-0 rounded-3xl border border-olive-line bg-surface-raised px-4 py-5 shadow-lift"
      >
        <h2 id={titleId} ref={headingRef} tabIndex={-1} className="sr-only">
          {stepTitle[step]}
        </h2>
        <p className="mb-4 text-sm text-olive-strong">Enviar no confirma la mesa. El equipo de PIÙ la revisa antes.</p>
        {step === 1 ? <ReservationDateStep draft={draft} errors={errors} today={today} onChange={patch} /> : null}
        {step === 2 ? (
          <ReservationTimeStep draft={draft} errors={errors} onChange={(preferredTime) => patch({ preferredTime })} />
        ) : null}
        {step === 3 ? (
          <div className="flex flex-col gap-5">
            <ReservationSummary draft={draft} phone={phone} />
            <ReservationContactStep draft={draft} errors={errors} onChange={patch} />
            <p className="text-sm text-olive-muted">
              Usamos tu nombre y celular solo para coordinar esta solicitud. La política de privacidad todavía no está
              publicada.
            </p>
          </div>
        ) : null}
        {formError ? (
          <p className="mt-4 text-sm font-semibold text-terracotta" role="alert">
            {formError}
          </p>
        ) : null}
      </section>

      <div className="flex items-center gap-3">
        {step > 1 ? (
          <Button type="button" variant="secondary" size="lg" className="h-12 min-w-28 bg-cream" onClick={goBack}>
            Volver
          </Button>
        ) : null}
        {step < 3 ? (
          <Button type="submit" variant="accent" size="lg" className="h-12 flex-1">
            Continuar
          </Button>
        ) : (
          <Button type="submit" variant="accent" size="lg" className="h-12 flex-1" disabled={!receptionEnabled || sending}>
            {sending ? "Enviando…" : "Enviar solicitud"}
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
