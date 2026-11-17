"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { fullDayNotice } from "@/lib/reservations/operations"
import type { OperationRules } from "@/lib/reservations/operations"
import type { DayOverride } from "@/lib/reservations/day-policy"

import { useTablesDraft } from "../tables/tables-draft"

type ReservationReceptionProps = {
  rules: OperationRules
  date: string
  day: DayOverride
  confirmedCount: number
  preview?: boolean
}

function ReservationReception({ rules, date, day, confirmedCount, preview = false }: ReservationReceptionProps) {
  const router = useRouter()
  const form = useTablesDraft(rules, confirmedCount, preview)
  const [pausedNotice, setPausedNotice] = useState(rules.notices.paused.text)
  const paused = form.draft.receptionPaused

  function openDate(next: string) {
    if (preview || !/^\d{4}-\d{2}-\d{2}$/.test(next)) return
    const search = new URLSearchParams(window.location.search)
    search.set("serviceDate", next)
    router.push(`/admin/reservas?${search.toString()}`)
  }

  return (
    <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <div className="admin-card flex min-w-0 flex-col gap-3 p-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-olive-muted uppercase">Reservas online</p>
          <p className="font-heading text-xl font-extrabold text-olive">{paused ? "Pausadas" : "Activas"}</p>
          <p className="mt-1 text-sm text-olive-muted">
            {paused ? "No entran solicitudes nuevas, de ninguna fecha. Las que ya existen siguen aquí." : "El formulario público está recibiendo solicitudes."}
          </p>
        </div>
        <label className="flex flex-col gap-1 text-sm font-semibold text-olive">
          Mensaje mientras está en pausa
          <Textarea
            value={pausedNotice}
            maxLength={400}
            rows={3}
            onChange={(event) => setPausedNotice(event.target.value)}
            aria-label="Mensaje de pausa"
            className="min-h-24 bg-cream"
          />
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="secondary"
            className="h-12"
            disabled={form.pending || pausedNotice.trim().length < 8 || pausedNotice.trim() === rules.notices.paused.text.trim()}
            onClick={() =>
              void form.save(
                {
                  ...form.draft,
                  notices: { ...form.draft.notices, paused: { enabled: true, text: pausedNotice.trim() } },
                },
                "messages",
              )
            }
          >
            Guardar mensaje
          </Button>
          <Button
            type="button"
            variant={paused ? "primary" : "secondary"}
            className="h-12"
            disabled={form.pending}
            onClick={() => void form.save({ ...form.draft, receptionPaused: !paused }, "reception")}
          >
            {paused ? "Reanudar reservas" : "Pausar reservas"}
          </Button>
        </div>
      </div>

      <div className="admin-card flex min-w-0 flex-col gap-3 p-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-olive-muted uppercase">Un día</p>
          <p className="font-heading text-xl font-extrabold text-olive">{day.full ? "Reservas completas" : "Acepta reservas"}</p>
          <p className="mt-1 text-sm text-olive-muted">Solo esa fecha. El resto de los días no cambia y las reservas ya hechas se mantienen.</p>
        </div>
        <label className="flex flex-col gap-1 text-sm font-semibold text-olive">
          Fecha
          <Input type="date" value={date} onChange={(event) => openDate(event.target.value)} aria-label="Fecha de las reservas online" className="bg-cream" />
        </label>
        {day.closed ? (
          <p className="text-sm font-semibold text-olive">Ese día el local está cerrado para reservas en línea.</p>
        ) : (
          <Button
            type="button"
            className="h-12"
            variant={day.full ? "secondary" : "primary"}
            disabled={form.pending}
            onClick={() => {
              const next = { ...day, full: !day.full, notice: day.full ? null : fullDayNotice(date) }
              void form.saveDay(next)
            }}
          >
            {day.full ? "Volver a habilitar la fecha" : "Marcar reservas completas"}
          </Button>
        )}
        {day.full ? <p className="text-sm text-olive-strong">{day.notice ?? fullDayNotice(date)}</p> : null}
      </div>

      <div className="lg:col-span-2 empty:hidden" aria-live="polite">
        {form.message ? <p className="rounded-xl bg-olive-hover px-4 py-3 text-sm font-semibold text-olive">{form.message}</p> : null}
        {form.error ? (
          <p role="alert" className="rounded-xl bg-status-closed-soft px-4 py-3 text-sm font-semibold text-status-closed">
            {form.error}
          </p>
        ) : null}
      </div>
    </section>
  )
}

export { ReservationReception }
