"use client"

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react"

import { noteReservationProgress } from "@/components/features/metrics/visit-meter"
import { ReservationContactStep } from "@/components/features/reservations/reservation-contact-step"
import { ReservationDateStep } from "@/components/features/reservations/reservation-date-step"
import { ReservationProgress } from "@/components/features/reservations/reservation-progress"
import { ReservationSummary } from "@/components/features/reservations/reservation-summary"
import { ReservationTimeStep } from "@/components/features/reservations/reservation-time-step"
import { ReservationSuccess } from "@/components/features/reservations/reservation-success"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { requiredLeadHours, reservationWhatsappMessage } from "@/lib/reservations/configuration"
import { todayIsoInSantiago } from "@/lib/reservations/schedule"
import { normalizeChileMobile, validateContact, validateTime, validateVisit } from "@/lib/reservations/validation"
import type { PublicReceipt } from "@/lib/reservations/views"
import { admitRequest, visitException, type DayOverride } from "@/lib/reservations/day-policy"
import { defaultOperationRules, publicRules } from "@/lib/reservations/operations"
import type { ReservationDraft, ReservationErrors, ReservationStep } from "@/lib/reservations/types"

const whatsappHref = `https://wa.me/56928873619?text=${encodeURIComponent(reservationWhatsappMessage)}`
const consultHref = `https://wa.me/56928873619?text=${encodeURIComponent("Hola, quiero consultar por una reserva en PIÙ.")}`

const initialDraft: ReservationDraft = {
  date: "",
  partySize: 2,
  zone: null,
  preferredTime: "",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  marketingOptIn: true,
  notes: "",
}

const stepTitle = {
  1: "Tu visita",
  2: "Horario",
  3: "Tus datos",
} as const

function ReservationClosed({ message }: { message: string }) {
  return (
    <section
      data-reservation-form=""
      data-reservation-paused="on"
      className="mx-auto w-full max-w-xl rounded-3xl border border-olive-line bg-surface-raised px-5 py-8 shadow-lift"
    >
      <p className="font-label text-xs font-semibold tracking-[0.14em] text-terracotta uppercase">Reservas en línea</p>
      <h2 className="mt-3 font-heading text-xl leading-snug font-extrabold tracking-[-0.02em] text-olive sm:text-2xl">
        {message}
      </h2>
      <p className="mt-4 text-base leading-relaxed text-olive-strong">Si quieres consultar, escríbenos por WhatsApp.</p>
      <Button asChild variant="accent" size="lg" className="mt-6 h-12 w-full">
        <a href={consultHref} target="_blank" rel="noopener noreferrer">
          Escribir por WhatsApp
        </a>
      </Button>
    </section>
  )
}

function ReservationForm({ receptionEnabled }: { receptionEnabled: boolean }) {
  const [rules, setRules] = useState(publicRules(defaultOperationRules()))
  const [rulesReady, setRulesReady] = useState(false)
  const [day, setDay] = useState<DayOverride | null>(null)
  const [step, setStep] = useState<ReservationStep>(1)
  const [draft, setDraft] = useState<ReservationDraft>(initialDraft)
  const [errors, setErrors] = useState<ReservationErrors>({})
  const [sending, setSending] = useState(false)
  const [formError, setFormError] = useState("")
  const [receipt, setReceipt] = useState<PublicReceipt | null>(null)
  const [trackingToken, setTrackingToken] = useState<string | null>(null)
  useEffect(() => {
    noteReservationProgress({ reached: step === 3, saved: receipt !== null })
  }, [step, receipt])
  const requestKey = useRef<string | null>(null)
  const today = useSyncExternalStore(
    () => () => {},
    todayIsoInSantiago,
    () => ""
  )
  const headingRef = useRef<HTMLHeadingElement>(null)
  const titleId = useId()

  useEffect(() => {
    let active = true
    void fetch("/api/reservations")
      .then((response) => response.json())
      .then((payload: { rules?: ReturnType<typeof publicRules> }) => {
        if (active && payload.rules?.clock) setRules(payload.rules)
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setRulesReady(true)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!draft.date) return
    let active = true
    void fetch(`/api/reservations?date=${draft.date}`)
      .then((response) => response.json())
      .then((payload: { rules?: ReturnType<typeof publicRules>; day?: DayOverride | null }) => {
        if (!active) return
        if (payload.rules?.clock) setRules(payload.rules)
        if (payload.day) setDay(payload.day)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [draft.date])

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [step])

  const phone = normalizeChileMobile(draft.customerPhone) ?? ""
  const visitRules = { ...rules, day }
  const admission = draft.date ? admitRequest(rules, day, draft.date) : rules.receptionPaused ? admitRequest(rules, null, "2099-01-05") : { ok: true as const }
  const blocked = !admission.ok

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
    const nextErrors = step === 1 ? validateVisit(draft, new Date(), visitRules) : validateTime(draft, new Date(), visitRules)
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
    if (!receptionEnabled || sending || blocked) return
    const nextErrors = validateContact(draft, new Date(), visitRules)
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
          customerEmail: draft.customerEmail,
          marketingOptIn: draft.marketingOptIn === true,
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

  if (rulesReady && rules.receptionPaused) {
    const notice = admitRequest(rules, null, "2099-01-05")
    return <ReservationClosed message={notice.ok ? "Por ahora no estamos tomando reservas en línea." : notice.message} />
  }

  if (receptionEnabled && !rulesReady) {
    return (
      <section data-reservation-form="" data-reservation-enabled="on" aria-busy="true" className="min-h-[32.5rem] rounded-3xl border border-olive-line bg-surface-raised px-5 py-8 shadow-lift">
        <p className="text-base text-olive-muted">Revisando si podemos tomar tu reserva…</p>
      </section>
    )
  }

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
          Por ahora no puedes enviar una solicitud por aquí. Escríbenos por WhatsApp y te ayudamos a reservar.
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
    return <ReservationSuccess receipt={receipt} trackingToken={trackingToken} whatsappHref={whatsappHref} promotionsRequested={draft.marketingOptIn === true} />
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
        {!admission.ok ? (
          <p role="status" className="mb-4 rounded-2xl border border-olive-line bg-cream px-4 py-3 text-base text-olive">
            {admission.message}
          </p>
        ) : null}
        {step === 1 ? <ReservationDateStep draft={draft} errors={errors} today={today} maxParty={rules.maxParty} onChange={patch} /> : null}
        {step === 2 ? (
          <ReservationTimeStep
            draft={draft}
            errors={errors}
            clock={rules.clock}
            week={rules.week}
            visit={visitException(day)}
            leadHours={requiredLeadHours(rules.anticipation.weekdayLeadHours)}
            onChange={(preferredTime) => patch({ preferredTime })}
          />
        ) : null}
        {step === 3 ? (
          <div className="flex flex-col gap-5">
            <ReservationSummary draft={draft} phone={phone} />
            <ReservationContactStep draft={draft} errors={errors} onChange={patch} />
            <label className="flex min-h-11 items-start gap-3 text-sm leading-5 text-olive">
              <Checkbox
                checked={draft.marketingOptIn === true}
                onCheckedChange={(value) => patch({ marketingOptIn: value === true })}
                className="mt-0.5"
                aria-describedby="reservation-promotions-note"
              />
              <span>Acepto recibir información, novedades y promociones de PIÙ Pizza & Dolce por correo electrónico.</span>
            </label>
            <p id="reservation-promotions-note" className="-mt-3 text-xs text-olive-muted">
              Si no la quieres, desmárcala.
            </p>
            <p className="text-sm text-olive-muted">Tu solicitud queda pendiente hasta que la confirmemos.</p>
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
          <Button type="submit" variant="accent" size="lg" className="h-12 flex-1" disabled={blocked}>
            Continuar
          </Button>
        ) : (
          <Button type="submit" variant="accent" size="lg" className="h-12 flex-1" disabled={!receptionEnabled || sending || blocked}>
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
