"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Heading, Text } from "@/components/ui/typography"
import { adminRequestHeader, adminRequestValue } from "@/lib/auth/session-policy"
import type { DayOverride } from "@/lib/reservations/day-policy"
import { criticalFingerprint, knownSingleTableSeats, type OperationRules, type SectorTables } from "@/lib/reservations/operations"
import type { WeekSchedule, Weekday } from "@/lib/reservations/schedule"

const dayLabels: { id: Weekday; label: string }[] = [
  { id: "mon", label: "Lunes" },
  { id: "tue", label: "Martes" },
  { id: "wed", label: "Miércoles" },
  { id: "thu", label: "Jueves" },
  { id: "fri", label: "Viernes" },
  { id: "sat", label: "Sábado" },
  { id: "sun", label: "Domingo" },
]

type FloorEditorProps = {
  rules: OperationRules
  date: string
  bookings: { id: string }[]
  pendingCount: number
  confirmedCount: number
  pendingTruncated: boolean
  day: DayOverride
  preview?: boolean
}

function FloorEditor({
  rules,
  date,
  pendingCount,
  confirmedCount,
  pendingTruncated,
  day,
  preview = false,
}: FloorEditorProps) {
  const router = useRouter()
  const [draft, setDraft] = useState(rules)
  const [dayDraft, setDayDraft] = useState(day)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  const [confirmCritical, setConfirmCritical] = useState(false)
  const minutes = draft.serviceMinutes ?? 90
  const sectorError = sectorProblem(draft.sectors)

  async function post(body: unknown) {
    const response = await fetch("/api/admin/tables", {
      method: "POST",
      headers: { "content-type": "application/json", [adminRequestHeader]: adminRequestValue },
      body: JSON.stringify(body),
    })
    const payload = (await response.json().catch(() => null)) as { message?: string } | null
    if (!response.ok) {
      setError(payload?.message ?? "No se pudo guardar.")
      return false
    }
    return true
  }

  async function save(next: OperationRules, force = false) {
    const problem = sectorProblem(next.sectors)
    if (problem || next.serviceMinutes === null || next.serviceMinutes < 30 || next.serviceMinutes > 300) {
      setError(problem || "La duración tiene que estar entre 30 y 300 minutos.")
      return
    }
    const affectsConfirmed = confirmedCount > 0 && criticalFingerprint(next) !== criticalFingerprint(rules)
    if (affectsConfirmed && !force && !confirmCritical) {
      setConfirmCritical(true)
      setMessage("Hay reservas confirmadas. Este cambio no las cancela. Pulsa guardar otra vez para aplicarlo.")
      return
    }
    setConfirmCritical(false)
    setPending(true)
    setError("")
    if (preview) {
      setDraft(next)
      setPending(false)
      setMessage("Vista previa. Aquí no se escribe en Firestore.")
      return
    }
    const saved = await post({
      action: "save",
      rules: {
        serviceMinutes: next.serviceMinutes,
        receptionPaused: next.receptionPaused,
        fullNotice: next.notices.full.text.trim(),
        sectors: next.sectors,
        week: next.week,
      },
    })
    setPending(false)
    if (!saved) return
    setDraft(next)
    setMessage(next.receptionPaused ? "Recepción en pausa. Las reservas ya hechas siguen en el panel." : "Configuración guardada.")
    router.refresh()
  }

  async function saveDay(next: DayOverride) {
    if (next.closed && next.full) {
      setError("Ese día ya está cerrado. No hace falta marcarlo completo.")
      return
    }
    setPending(true)
    setError("")
    if (preview) {
      setDayDraft(next)
      setPending(false)
      setMessage("Vista previa. El día no se guardó.")
      return
    }
    const saved = await post({ action: "save-day", day: next })
    setPending(false)
    if (!saved) return
    setDayDraft(next)
    setMessage(next.full ? "Ese día quedó marcado como completo." : "Ese día vuelve a aceptar reservas.")
    router.refresh()
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Heading as="h1" size="h3">
          Mesas
        </Heading>
        <Text tone="muted">
          {pendingCount} solicitudes pendientes{pendingTruncated ? " o más" : ""} y {confirmedCount} confirmadas para esta fecha.
          Un grupo de más de {knownSingleTableSeats} personas queda pendiente: no confirmamos una mesa que no sabemos si cabe.
        </Text>
      </header>

      <div aria-live="polite" className="empty:hidden">
        {message ? <p className="rounded-xl bg-olive-hover px-4 py-3 text-base font-semibold">{message}</p> : null}
      </div>
      {error ? (
        <p role="alert" className="rounded-xl border border-olive-soft px-4 py-3 text-base">
          {error}
        </p>
      ) : null}

      <section className="flex flex-col gap-4 rounded-2xl border border-olive-line bg-surface-raised p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <Heading as="h2" size="h4">
              Recepción
            </Heading>
            <Text tone="muted">{draft.receptionPaused ? "Las solicitudes nuevas están en pausa." : "Se pueden recibir solicitudes."}</Text>
          </div>
          <Button
            type="button"
            variant={draft.receptionPaused ? "primary" : "secondary"}
            disabled={pending}
            onClick={() => void save({ ...draft, receptionPaused: !draft.receptionPaused })}
          >
            {draft.receptionPaused ? "Activar reservas" : "Pausar reservas"}
          </Button>
        </div>
        <Text size="sm" tone="muted">
          Pausar no enciende la página pública ni borra lo ya pedido. La recepción del sitio sigue apagada hasta publicar la política de
          privacidad.
        </Text>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-olive-line bg-surface-raised p-4">
        <div className="flex flex-col gap-1">
          <Heading as="h2" size="h4">
            Mesas por sector
          </Heading>
          <Text tone="muted">Las que no quedan para la web se atienden por orden de llegada.</Text>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <SectorCard
            title="Salón"
            requestMax={draft.maxParty.salon}
            value={draft.sectors.salon}
            onChange={(salon) => setDraft({ ...draft, sectors: { ...draft.sectors, salon } })}
          />
          <SectorCard
            title="Terraza"
            requestMax={draft.maxParty.terrace}
            value={draft.sectors.terrace}
            onChange={(terrace) => setDraft({ ...draft, sectors: { ...draft.sectors, terrace } })}
          />
        </div>
        {sectorError ? <FieldError>{sectorError}</FieldError> : null}
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-olive-line bg-surface-raised p-4">
        <div className="flex flex-col gap-1">
          <Heading as="h2" size="h4">
            Duración de reserva
          </Heading>
          <Text tone="muted">Una reserva ocupa un cupo del sector durante este tiempo. Después el cupo queda libre.</Text>
        </div>
        <Field>
          <FieldLabel htmlFor="service-minutes">Minutos</FieldLabel>
          <Input
            id="service-minutes"
            inputMode="numeric"
            className="h-12 max-w-40"
            value={String(minutes)}
            onChange={(event) => {
              const value = Number(event.target.value)
              setDraft({ ...draft, serviceMinutes: Number.isInteger(value) ? value : draft.serviceMinutes })
            }}
          />
        </Field>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-olive-line bg-surface-raised p-4">
        <div className="flex flex-col gap-1">
          <Heading as="h2" size="h4">
            Horario semanal
          </Heading>
          <Text tone="muted">Queda guardado y se repite cada semana hasta que lo cambies.</Text>
        </div>
        <ul className="flex flex-col gap-3">
          {dayLabels.map((day) => {
            const row = draft.week[day.id]
            return (
              <li key={day.id} className="flex flex-col gap-3 border-t border-olive-line pt-3 first:border-t-0 first:pt-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-heading text-base font-bold">{day.label}</span>
                  <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
                    <Checkbox
                      checked={row.open}
                      onCheckedChange={(checked) => setWeek(setDraft, draft.week, day.id, { open: checked === true })}
                    />
                    Abierto
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor={`${day.id}-open`}>Apertura</FieldLabel>
                    <Input
                      id={`${day.id}-open`}
                      type="time"
                      className="h-12"
                      value={row.opensAt}
                      onChange={(event) => setWeek(setDraft, draft.week, day.id, { opensAt: event.target.value })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${day.id}-close`}>Cierre</FieldLabel>
                    <Input
                      id={`${day.id}-close`}
                      type="time"
                      className="h-12"
                      value={row.closesAt}
                      onChange={(event) => setWeek(setDraft, draft.week, day.id, { closesAt: event.target.value })}
                    />
                  </Field>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-olive-line bg-surface-raised p-4">
        <div className="flex flex-col gap-1">
          <Heading as="h2" size="h4">
            Un día completo
          </Heading>
          <Text tone="muted">Marca una fecha cuando ya no queden reservas en línea. Las mesas de llegada siguen disponibles.</Text>
        </div>
        <Field>
          <FieldLabel htmlFor="full-date">Fecha</FieldLabel>
          <Input
            id="full-date"
            type="date"
            className="h-12 max-w-full"
            value={preview ? dayDraft.date : date}
            onChange={(event) => {
              const next = event.target.value
              if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) return
              if (preview) {
                setDayDraft({ ...dayDraft, date: next, full: false })
                return
              }
              router.push(`/admin/mesas?date=${next}`)
            }}
          />
        </Field>
        <label className="flex min-h-11 items-center gap-3 text-base font-semibold">
          <Checkbox
            checked={dayDraft.full}
            disabled={dayDraft.closed}
            onCheckedChange={(checked) => setDayDraft({ ...dayDraft, full: checked === true })}
          />
          Reservas completas
        </label>
        <Button type="button" variant="secondary" disabled={pending} onClick={() => void saveDay(dayDraft)}>
          Guardar este día
        </Button>
        <Field>
          <FieldLabel htmlFor="full-notice">Mensaje para quien quiere reservar</FieldLabel>
          <Textarea
            id="full-notice"
            rows={4}
            value={draft.notices.full.text}
            onChange={(event) =>
              setDraft({ ...draft, notices: { ...draft.notices, full: { ...draft.notices.full, enabled: true, text: event.target.value } } })
            }
          />
        </Field>
      </section>

      <Button type="button" size="lg" loading={pending} disabled={Boolean(sectorError)} onClick={() => void save(draft, confirmCritical)}>
        Guardar mesas y horarios
      </Button>
    </div>
  )
}

function SectorCard({
  title,
  requestMax,
  value,
  onChange,
}: {
  title: string
  requestMax: number
  value: SectorTables
  onChange: (value: SectorTables) => void
}) {
  const walkIn = Math.max(0, value.total - value.web)
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-olive-line p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-heading text-lg font-bold">{title}</span>
        <span className="font-label text-sm text-olive-muted">hasta {requestMax} personas</span>
      </div>
      <Field>
        <FieldLabel htmlFor={`${title}-total`}>Mesas</FieldLabel>
        <Input
          id={`${title}-total`}
          inputMode="numeric"
          className="h-12"
          value={String(value.total)}
          onChange={(event) => onChange({ ...value, total: whole(event.target.value, value.total) })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${title}-web`}>Para reservas web</FieldLabel>
        <Input
          id={`${title}-web`}
          inputMode="numeric"
          className="h-12"
          value={String(value.web)}
          onChange={(event) => onChange({ ...value, web: whole(event.target.value, value.web) })}
        />
      </Field>
      <Text size="sm" tone="muted">
        {walkIn} por orden de llegada
      </Text>
    </div>
  )
}

function setWeek(
  setDraft: (value: OperationRules | ((current: OperationRules) => OperationRules)) => void,
  week: WeekSchedule,
  day: Weekday,
  patch: Partial<WeekSchedule[Weekday]>,
) {
  setDraft((current) => ({ ...current, week: { ...week, [day]: { ...week[day], ...patch } } }))
}

function whole(value: string, fallback: number) {
  if (value.trim() === "") return 0
  const number = Number(value)
  return Number.isInteger(number) && number >= 0 && number <= 40 ? number : fallback
}

function sectorProblem(sectors: OperationRules["sectors"]) {
  if (sectors.salon.web > sectors.salon.total) return "En el salón hay más mesas para la web que mesas en total."
  if (sectors.terrace.web > sectors.terrace.total) return "En la terraza hay más mesas para la web que mesas en total."
  return ""
}

export { FloorEditor }
