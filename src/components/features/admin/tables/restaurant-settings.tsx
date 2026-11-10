"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Heading, Text } from "@/components/ui/typography"
import type { OperationRules, SectorTables } from "@/lib/reservations/operations"
import type { WeekSchedule, Weekday } from "@/lib/reservations/schedule"

import "../admin-shell.css"
import { Status } from "./floor-editor"
import { dayLabels, sectorProblem, useTablesDraft, whole } from "./tables-draft"

type SectionId = "hours" | "rules" | "zones" | "messages"

function RestaurantSettings({
  rules,
  confirmedCount,
  preview = false,
}: {
  rules: OperationRules
  confirmedCount: number
  preview?: boolean
}) {
  const form = useTablesDraft(rules, confirmedCount, preview)
  const { draft, setDraft } = form
  const [open, setOpen] = useState<SectionId | null>(null)
  const minutes = draft.serviceMinutes ?? 90
  const problem = sectorProblem(draft.sectors)
  const save = (section: "hours" | "rules" | "zones" | "messages") => void form.save(draft, section, form.confirmCritical)

  return (
    <div className="mx-auto grid w-full max-w-3xl min-w-0 grid-cols-1 gap-3 lg:max-w-[76rem] lg:grid-cols-2 lg:items-start lg:gap-4">
      <header className="lg:col-span-2">
        <Heading as="h1" size="h3">
          Configuración
        </Heading>
        <Text tone="muted">La pausa y el día completo se manejan en Mesas.</Text>
      </header>
      <div className="lg:col-span-2">
        <Status form={form} />
      </div>

      <ConfigCard
        title="Horarios de atención"
        summary={weekSummary(draft.week)}
        open={open === "hours"}
        onToggle={() => setOpen(open === "hours" ? null : "hours")}
        pending={form.pending}
        onSave={() => save("hours")}
        wide
      >
        <ul className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-x-6">
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
                    <Input id={`${day.id}-open`} type="time" className="admin-control" value={row.opensAt} onChange={(event) => setWeek(setDraft, draft.week, day.id, { opensAt: event.target.value })} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${day.id}-close`}>Cierre</FieldLabel>
                    <Input id={`${day.id}-close`} type="time" className="admin-control" value={row.closesAt} onChange={(event) => setWeek(setDraft, draft.week, day.id, { closesAt: event.target.value })} />
                  </Field>
                </div>
              </li>
            )
          })}
        </ul>
      </ConfigCard>

      <ConfigCard
        title="Reglas de reservas"
        summary={`${minutes} min por reserva · entre semana ${draft.anticipation.weekdayLeadHours == null ? "sin anticipación definida" : `${draft.anticipation.weekdayLeadHours} h`}`}
        open={open === "rules"}
        onToggle={() => setOpen(open === "rules" ? null : "rules")}
        pending={form.pending}
        onSave={() => save("rules")}
      >
        <Field>
          <FieldLabel htmlFor="service-minutes">Duración de cada reserva, en minutos</FieldLabel>
          <Input
            id="service-minutes"
            inputMode="numeric"
            className="admin-control max-w-40"
            value={String(minutes)}
            onChange={(event) => {
              const value = Number(event.target.value)
              setDraft({ ...draft, serviceMinutes: Number.isInteger(value) ? value : draft.serviceMinutes })
            }}
          />
        </Field>
        <p className="text-sm text-olive-muted">
          Corte de fin de semana: {draft.anticipation.weekendPreviousDayCutoff ?? "sin definir"}. La anticipación no se cambia aquí. La recepción se pausa en Mesas.
        </p>
      </ConfigCard>

      <ConfigCard
        title="Zonas y cupos"
        summary={`Salón ${draft.sectors.salon.web} de ${draft.sectors.salon.total} · Terraza ${draft.sectors.terrace.web} de ${draft.sectors.terrace.total}`}
        open={open === "zones"}
        onToggle={() => setOpen(open === "zones" ? null : "zones")}
        pending={form.pending}
        disabled={Boolean(problem)}
        onSave={() => save("zones")}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <SectorFields title="Salón" value={draft.sectors.salon} onChange={(salon) => setDraft({ ...draft, sectors: { ...draft.sectors, salon } })} />
          <SectorFields title="Terraza" value={draft.sectors.terrace} onChange={(terrace) => setDraft({ ...draft, sectors: { ...draft.sectors, terrace } })} />
        </div>
        {problem ? <FieldError>{problem}</FieldError> : null}
        <Link href="/admin/mesas" className="inline-flex h-11 items-center text-sm font-semibold text-terracotta">
          Operación del día en Mesas
        </Link>
      </ConfigCard>

      <ConfigCard
        title="Mensajes al cliente"
        summary="Recepción pausada, día completo, día sin reservas y local cerrado."
        open={open === "messages"}
        onToggle={() => setOpen(open === "messages" ? null : "messages")}
        pending={form.pending}
        onSave={() => save("messages")}
      >
        <NoticeField id="notice-paused" label="Recepción pausada" value={draft.notices.paused.text} onChange={(text) => setNotice(setDraft, "paused", text)} />
        <NoticeField id="notice-full" label="Día completo" value={draft.notices.full.text} onChange={(text) => setNotice(setDraft, "full", text)} />
        <NoticeField id="notice-closed" label="Día sin reservas" value={draft.notices.closedDay.text} onChange={(text) => setNotice(setDraft, "closedDay", text)} />
        <NoticeField id="notice-venue" label="Local cerrado" value={draft.notices.venueClosed.text} onChange={(text) => setNotice(setDraft, "venueClosed", text)} />
      </ConfigCard>

      <section className="admin-card p-4 lg:col-span-2">
        <h2 className="font-heading text-lg font-bold">Usuarios y permisos</h2>
        <p className="mt-1 text-sm text-olive-strong">Las cuentas del equipo todavía no se crean desde el sitio.</p>
        <Link href="/admin/personal" className="mt-2 inline-flex h-11 items-center text-sm font-semibold text-terracotta">
          Ver el estado de Personal
        </Link>
      </section>
    </div>
  )
}

function ConfigCard({
  title,
  summary,
  open,
  onToggle,
  onSave,
  pending,
  disabled = false,
  wide = false,
  children,
}: {
  title: string
  summary: string
  open: boolean
  onToggle: () => void
  onSave: () => void
  pending: boolean
  disabled?: boolean
  wide?: boolean
  children: ReactNode
}) {
  return (
    <section className={cn("admin-card p-4", wide && "lg:col-span-2")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading text-lg font-bold">{title}</h2>
          <p className="mt-1 text-sm text-olive-strong">{summary}</p>
        </div>
        <Button type="button" variant="secondary" className="admin-action-secondary h-11 shrink-0" aria-expanded={open} onClick={onToggle}>
          {open ? "Cerrar" : "Editar"}
        </Button>
      </div>
      {open ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-olive-line pt-4">
          {children}
          <Button type="button" className="h-11" loading={pending} disabled={disabled} onClick={onSave}>
            Guardar
          </Button>
        </div>
      ) : null}
    </section>
  )
}

function weekSummary(week: OperationRules["week"]) {
  const openDays = dayLabels.filter((day) => week[day.id].open)
  if (openDays.length === 0) return "Todos los días cerrados"
  const first = week[openDays[0].id]
  const same = openDays.every((day) => week[day.id].opensAt === first.opensAt && week[day.id].closesAt === first.closesAt)
  const names = openDays.map((day) => day.label.slice(0, 3)).join(", ")
  return same ? `${names} · ${first.opensAt}–${first.closesAt}` : `${openDays.length} días con horario propio`
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
