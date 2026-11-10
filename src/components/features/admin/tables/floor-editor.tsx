"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Heading } from "@/components/ui/typography"
import type { OperationRules } from "@/lib/reservations/operations"
import type { DayOverride } from "@/lib/reservations/day-policy"

import "../admin-shell.css"
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

  const paused = form.draft.receptionPaused
  return (
    <div className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-4 lg:max-w-[76rem]">
      <header>
        <Heading as="h1" size="h3">
          Mesas
        </Heading>
        <p className="text-sm text-olive-muted">
          {pendingCount} pendientes{pendingTruncated ? " o más" : ""} · {confirmedCount} confirmadas
        </p>
      </header>

      <Status form={form} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <section className="admin-card flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-olive-muted uppercase">Recepción</p>
          <p className="font-heading text-2xl font-extrabold text-olive">{paused ? "Pausada" : "Activa"}</p>
        </div>
        <Button
          type="button"
          variant={paused ? "primary" : "secondary"}
          className={cn("h-11 shrink-0", !paused && "admin-action-secondary")}
          disabled={form.pending}
          onClick={() => void form.save({ ...form.draft, receptionPaused: !paused }, "reception")}
        >
          {paused ? "Reanudar" : "Pausar"}
        </Button>
      </section>

      <section className="admin-card flex min-w-0 flex-col gap-3 p-4">
        <h2 className="font-heading text-lg font-bold">Este día</h2>
        <Field>
          <FieldLabel htmlFor="full-date">Fecha</FieldLabel>
          <Input
            id="full-date"
            type="date"
            className="admin-control h-12"
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
        {dayDraft.closed ? (
          <p className="text-sm font-semibold text-olive">Día cerrado para reservas en línea.</p>
        ) : (
          <Button
            type="button"
            variant={dayDraft.full ? "secondary" : "primary"}
            className="h-11"
            disabled={form.pending}
            onClick={() => {
              const next = { ...dayDraft, full: !dayDraft.full }
              setDayDraft(next)
              void form.saveDay(next)
            }}
          >
            {dayDraft.full ? "Volver a abrir el día" : "Marcar día completo"}
          </Button>
        )}
      </section>

      <section className="admin-card p-4">
        <h2 className="font-heading text-lg font-bold">Cupos web</h2>
        <ul className="mt-3 grid grid-cols-2 gap-2">
          <li className="rounded-2xl bg-[#f3f1e6] px-3 py-3">
            <p className="text-xs text-olive-muted">Salón</p>
            <p className="font-heading text-2xl font-extrabold">{form.draft.sectors.salon.web}</p>
            <p className="text-xs text-olive-muted">de {form.draft.sectors.salon.total} mesas</p>
          </li>
          <li className="rounded-2xl bg-[#f3f1e6] px-3 py-3">
            <p className="text-xs text-olive-muted">Terraza</p>
            <p className="font-heading text-2xl font-extrabold">{form.draft.sectors.terrace.web}</p>
            <p className="text-xs text-olive-muted">de {form.draft.sectors.terrace.total} mesas</p>
          </li>
        </ul>
        {canEditSettings ? (
          <Link href="/admin/configuracion" className="mt-3 inline-flex h-11 items-center text-sm font-semibold text-terracotta">
            Editar reglas en Configuración
          </Link>
        ) : (
          <p className="mt-3 text-sm text-olive-muted">Las cantidades las cambia el propietario en Configuración.</p>
        )}
      </section>
      </div>
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
