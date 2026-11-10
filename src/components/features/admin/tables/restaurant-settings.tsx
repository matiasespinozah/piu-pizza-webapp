"use client"

import type { ReactNode } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Heading, Text } from "@/components/ui/typography"
import type { OperationRules, SectorTables } from "@/lib/reservations/operations"
import type { WeekSchedule, Weekday } from "@/lib/reservations/schedule"

import { Status } from "./floor-editor"
import { dayLabels, sectorProblem, useTablesDraft, whole } from "./tables-draft"

function RestaurantSettings({ rules, confirmedCount }: { rules: OperationRules; confirmedCount: number }) {
  const form = useTablesDraft(rules, confirmedCount, false)
  const { draft, setDraft } = form
  const minutes = draft.serviceMinutes ?? 90
  const problem = sectorProblem(draft.sectors)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header className="flex flex-col gap-1">
        <Heading as="h1" size="h3">
          Configuración
        </Heading>
        <Text tone="muted">Reglas permanentes del local. La pausa del día y “reservas completas” se manejan en Mesas.</Text>
      </header>
      <Status form={form} />

      <SettingsBlock title="Horarios de atención" detail="Se repiten cada semana hasta que los cambies.">
        <ul className="flex flex-col gap-3">
          {dayLabels.map((day) => {
            const row = draft.week[day.id]
            return (
              <li key={day.id} className="flex flex-col gap-2 border-t border-olive-line pt-3 first:border-t-0 first:pt-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-heading font-bold">{day.label}</span>
                  <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
                    <Checkbox checked={row.open} onCheckedChange={(checked) => setWeek(setDraft, draft.week, day.id, { open: checked === true })} />
                    Abierto
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field>
                    <FieldLabel htmlFor={`${day.id}-open`}>Apertura</FieldLabel>
                    <Input id={`${day.id}-open`} type="time" className="h-11" value={row.opensAt} onChange={(event) => setWeek(setDraft, draft.week, day.id, { opensAt: event.target.value })} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${day.id}-close`}>Cierre</FieldLabel>
                    <Input id={`${day.id}-close`} type="time" className="h-11" value={row.closesAt} onChange={(event) => setWeek(setDraft, draft.week, day.id, { closesAt: event.target.value })} />
                  </Field>
                </div>
              </li>
            )
          })}
        </ul>
      </SettingsBlock>

      <SettingsBlock title="Reglas de reservas" detail="La confirmación sigue siendo manual: el equipo confirma cuando hay cupo válido.">
        <Field>
          <FieldLabel htmlFor="service-minutes">Duración de cada reserva, en minutos</FieldLabel>
          <Input
            id="service-minutes"
            inputMode="numeric"
            className="h-11 max-w-40"
            value={String(minutes)}
            onChange={(event) => {
              const value = Number(event.target.value)
              setDraft({ ...draft, serviceMinutes: Number.isInteger(value) ? value : draft.serviceMinutes })
            }}
          />
        </Field>
        <p className="text-sm text-olive-muted">
          Anticipación mínima entre semana: {draft.anticipation.weekdayLeadHours == null ? "sin definir" : `${draft.anticipation.weekdayLeadHours} h`}. Corte de fin de
          semana: {draft.anticipation.weekendPreviousDayCutoff ?? "sin definir"}. Esos dos valores no se editan en esta pantalla.
        </p>
        <p className="text-sm text-olive-muted">Recepción {draft.receptionPaused ? "en pausa" : "activa"}. Se cambia desde Mesas, durante el servicio.</p>
      </SettingsBlock>

      <SettingsBlock title="Zonas y cupos web" detail="Las mesas que no quedan para la web se atienden por orden de llegada.">
        <div className="grid gap-3 sm:grid-cols-2">
          <SectorFields title="Salón" value={draft.sectors.salon} onChange={(salon) => setDraft({ ...draft, sectors: { ...draft.sectors, salon } })} />
          <SectorFields title="Terraza" value={draft.sectors.terrace} onChange={(terrace) => setDraft({ ...draft, sectors: { ...draft.sectors, terrace } })} />
        </div>
        {problem ? <FieldError>{problem}</FieldError> : null}
        <Link href="/admin/mesas" className="text-sm font-semibold text-olive underline-offset-4 hover:underline">
          Operación del día en Mesas
        </Link>
      </SettingsBlock>

      <SettingsBlock title="Mensajes al cliente" detail="Se muestran en la página de reservas cuando corresponde.">
        <NoticeField id="notice-full" label="Día completo" value={draft.notices.full.text} onChange={(text) => setNotice(setDraft, "full", text)} />
        <NoticeField id="notice-paused" label="Recepción en pausa" value={draft.notices.paused.text} onChange={(text) => setNotice(setDraft, "paused", text)} />
        <NoticeField id="notice-closed" label="Día sin reservas en línea" value={draft.notices.closedDay.text} onChange={(text) => setNotice(setDraft, "closedDay", text)} />
        <NoticeField id="notice-venue" label="Local cerrado" value={draft.notices.venueClosed.text} onChange={(text) => setNotice(setDraft, "venueClosed", text)} />
      </SettingsBlock>

      <Button type="button" size="lg" loading={form.pending} disabled={Boolean(problem)} onClick={() => void form.save(draft, form.confirmCritical)}>
        Guardar configuración
      </Button>

      <SettingsBlock title="Usuarios y permisos" detail="Las cuentas del equipo todavía no se crean desde el sitio.">
        <p className="text-sm text-olive-strong">El primer propietario se asigna fuera del panel. Desde aquí no se cambian roles.</p>
        <Link href="/admin/personal" className="inline-flex h-11 items-center text-sm font-semibold text-olive underline-offset-4 hover:underline">
          Ver el estado de Personal
        </Link>
      </SettingsBlock>
    </div>
  )
}

function SettingsBlock({ title, detail, children }: { title: string; detail: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-olive-line bg-surface-raised p-4 shadow-tactile">
      <div>
        <h2 className="font-heading text-lg font-bold">{title}</h2>
        <p className="text-sm text-olive-muted">{detail}</p>
      </div>
      {children}
    </section>
  )
}

function SectorFields({ title, value, onChange }: { title: string; value: SectorTables; onChange: (value: SectorTables) => void }) {
  const walkIn = Math.max(0, value.total - value.web)
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-cream p-3">
      <span className="font-heading font-bold">{title}</span>
      <Field>
        <FieldLabel htmlFor={`${title}-total`}>Mesas</FieldLabel>
        <Input id={`${title}-total`} inputMode="numeric" className="h-11 bg-surface-raised" value={String(value.total)} onChange={(event) => onChange({ ...value, total: whole(event.target.value, value.total) })} />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${title}-web`}>Cupos web</FieldLabel>
        <Input id={`${title}-web`} inputMode="numeric" className="h-11 bg-surface-raised" value={String(value.web)} onChange={(event) => onChange({ ...value, web: whole(event.target.value, value.web) })} />
      </Field>
      <p className="text-xs text-olive-muted">{walkIn} por orden de llegada</p>
    </div>
  )
}

function NoticeField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea id={id} rows={3} value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
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

function setNotice(
  setDraft: (value: OperationRules | ((current: OperationRules) => OperationRules)) => void,
  key: keyof OperationRules["notices"],
  text: string,
) {
  setDraft((current) => ({ ...current, notices: { ...current.notices, [key]: { ...current.notices[key], enabled: true, text } } }))
}

export { RestaurantSettings }
