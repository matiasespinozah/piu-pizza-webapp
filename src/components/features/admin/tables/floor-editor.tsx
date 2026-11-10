"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Heading, Text } from "@/components/ui/typography"
import { knownSingleTableSeats, type OperationRules } from "@/lib/reservations/operations"
import type { DayOverride } from "@/lib/reservations/day-policy"

import { useTablesDraft } from "./tables-draft"

type FloorEditorProps = {
  rules: OperationRules
  date: string
  bookings: { id: string }[]
  pendingCount: number
  confirmedCount: number
  pendingTruncated: boolean
  day: DayOverride
  preview?: boolean
  canEditSettings?: boolean
}

function FloorEditor({
  rules,
  date,
  pendingCount,
  confirmedCount,
  pendingTruncated,
  day,
  preview = false,
  canEditSettings = false,
}: FloorEditorProps) {
  const router = useRouter()
  const form = useTablesDraft(rules, confirmedCount, preview)
  const [dayDraft, setDayDraft] = useState(day)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header className="flex flex-col gap-1">
        <Heading as="h1" size="h3">
          Mesas
        </Heading>
        <Text tone="muted">
          {pendingCount} solicitudes pendientes{pendingTruncated ? " o más" : ""} y {confirmedCount} confirmadas para esta fecha. Un grupo
          de más de {knownSingleTableSeats} personas queda pendiente.
        </Text>
      </header>

      <Status form={form} />

      <section className="flex flex-col gap-3 rounded-2xl border border-olive-line bg-surface-raised p-4 shadow-tactile">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-bold">Recepción</h2>
            <p className="text-sm text-olive-muted">{form.draft.receptionPaused ? "Las solicitudes nuevas están en pausa." : "Se pueden recibir solicitudes."}</p>
          </div>
          <Button
            type="button"
            variant={form.draft.receptionPaused ? "primary" : "secondary"}
            disabled={form.pending}
            onClick={() => void form.save({ ...form.draft, receptionPaused: !form.draft.receptionPaused })}
          >
            {form.draft.receptionPaused ? "Activar" : "Pausar"}
          </Button>
        </div>
        <Text size="sm" tone="muted">
          Pausar no borra lo ya pedido ni enciende la página pública.
        </Text>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-olive-line bg-surface-raised p-4 shadow-tactile">
        <h2 className="font-heading text-lg font-bold">Este día</h2>
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
            disabled={dayDraft.closed || form.pending}
            onCheckedChange={(checked) => setDayDraft({ ...dayDraft, full: checked === true })}
          />
          Reservas en línea completas
        </label>
        <Button type="button" variant="secondary" disabled={form.pending} onClick={() => void form.saveDay(dayDraft)}>
          Guardar este día
        </Button>
      </section>

      <section className="rounded-2xl border border-olive-line bg-surface-raised p-4 shadow-tactile">
        <h2 className="font-heading text-lg font-bold">Cupos web</h2>
        <ul className="mt-3 grid grid-cols-2 gap-2">
          <li className="rounded-xl bg-cream px-3 py-3">
            <p className="text-xs text-olive-muted">Salón</p>
            <p className="font-heading text-2xl font-extrabold">{form.draft.sectors.salon.web}</p>
            <p className="text-xs text-olive-muted">de {form.draft.sectors.salon.total} mesas</p>
          </li>
          <li className="rounded-xl bg-cream px-3 py-3">
            <p className="text-xs text-olive-muted">Terraza</p>
            <p className="font-heading text-2xl font-extrabold">{form.draft.sectors.terrace.web}</p>
            <p className="text-xs text-olive-muted">de {form.draft.sectors.terrace.total} mesas</p>
          </li>
        </ul>
        <p className="mt-3 text-sm text-olive-muted">
          {canEditSettings
            ? "Las cantidades se cambian en Configuración. El plano del local se suma cuando exista la distribución real."
            : "Las cantidades las cambia el propietario en Configuración. El plano del local se suma cuando exista la distribución real."}
        </p>
        {canEditSettings ? (
          <Link href="/admin/configuracion" className="mt-3 inline-flex text-sm font-semibold text-olive underline-offset-4 hover:underline">
            Abrir configuración
          </Link>
        ) : null}
      </section>
    </div>
  )
}

function Status({ form }: { form: ReturnType<typeof useTablesDraft> }) {
  return (
    <>
      <div aria-live="polite" className="empty:hidden">
        {form.message ? <p className="rounded-xl bg-olive-hover px-4 py-3 text-sm font-semibold">{form.message}</p> : null}
      </div>
      {form.error ? (
        <p role="alert" className="rounded-xl border border-olive-soft px-4 py-3 text-sm">
          {form.error}
        </p>
      ) : null}
    </>
  )
}

export { FloorEditor, Status }
