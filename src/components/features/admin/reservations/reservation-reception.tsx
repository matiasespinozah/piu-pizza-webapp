"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { OperationRules, ReceptionNoticeKey } from "@/lib/reservations/operations"
import type { DayOverride } from "@/lib/reservations/day-policy"

import { useTablesDraft } from "../tables/tables-draft"

type ReservationReceptionProps = {
  rules: OperationRules
  date: string
  day: DayOverride
  confirmedCount: number
  preview?: boolean
}

const noticeChoices: { id: ReceptionNoticeKey; label: string }[] = [
  { id: "paused", label: "Recepción pausada" },
  { id: "full", label: "Día completo" },
  { id: "closedDay", label: "Día sin reservas" },
  { id: "venueClosed", label: "Local cerrado" },
]

function ReservationReception({ rules, date, day, confirmedCount, preview = false }: ReservationReceptionProps) {
  const router = useRouter()
  const form = useTablesDraft(rules, confirmedCount, preview)
  const paused = form.draft.receptionPaused
  const [picking, setPicking] = useState(false)
  const [choice, setChoice] = useState<ReceptionNoticeKey>(rules.receptionNotice)

  function openDate(next: string) {
    if (preview || !/^\d{4}-\d{2}-\d{2}$/.test(next)) return
    const search = new URLSearchParams(window.location.search)
    search.set("serviceDate", next)
    router.push(`/admin/reservas?${search.toString()}`)
  }

  function toggleReception(active: boolean) {
    if (active) {
      void form.save({ ...form.draft, receptionPaused: false }, "reception")
      return
    }
    setChoice(form.draft.receptionNotice)
    setPicking(true)
  }

  function confirmPause() {
    setPicking(false)
    void form.save({ ...form.draft, receptionPaused: true, receptionNotice: choice }, "reception")
  }

  const shown = form.draft.notices[form.draft.receptionNotice]

  return (
    <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <div className="admin-card flex min-w-0 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-olive-muted uppercase">Reservas online</p>
            <p className="font-heading text-xl font-extrabold text-olive">{paused ? "Pausadas" : "Activas"}</p>
          </div>
          <ReceptionSwitch checked={!paused} disabled={form.pending} onCheckedChange={toggleReception} />
        </div>
        <p className="text-sm text-olive-muted">
          {paused ? shown.text : "El formulario público está recibiendo solicitudes."}
        </p>
      </div>

      <Sheet open={picking} onOpenChange={setPicking}>
        <SheetContent side="bottom" className="w-full max-w-full min-w-0 overflow-x-hidden max-h-[85dvh] rounded-t-2xl pb-safe">
          <SheetHeader>
            <SheetTitle>Mensaje al pausar</SheetTitle>
            <SheetDescription>Elige uno de los mensajes de Configuración. Quien intente reservar verá ese texto.</SheetDescription>
          </SheetHeader>
          <RadioGroup value={choice} onValueChange={(value) => setChoice(value as ReceptionNoticeKey)} className="min-h-0 flex-1 gap-2 overflow-y-auto px-4" aria-label="Mensaje de pausa">
            {noticeChoices.map((notice) => (
              <label key={notice.id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-olive-line bg-cream p-3">
                <RadioGroupItem value={notice.id} className="mt-0.5" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-olive">{notice.label}</span>
                  <span className="mt-1 block text-sm break-words text-olive-strong">{form.draft.notices[notice.id].text}</span>
                </span>
              </label>
            ))}
          </RadioGroup>
          <SheetFooter>
            <Button type="button" className="h-12" disabled={form.pending} onClick={confirmPause}>
              Pausar con este mensaje
            </Button>
            <Button type="button" variant="secondary" className="h-12" onClick={() => setPicking(false)}>
              Cancelar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <div className="admin-card flex min-w-0 flex-col gap-3 p-4">
        <label className="flex flex-col gap-1 text-sm font-semibold text-olive">
          Fecha
          <Input type="date" value={date} onChange={(event) => openDate(event.target.value)} aria-label="Fecha para cerrar las reservas online" className="bg-cream" />
        </label>
        {day.closed || day.full ? (
          <Button
            type="button"
            className="h-12"
            variant="secondary"
            disabled={form.pending}
            onClick={() => void form.saveDay({ ...day, closed: false, full: false, notice: null })}
          >
            Abrir este día
          </Button>
        ) : (
          <Button
            type="button"
            className="h-12"
            disabled={form.pending}
            onClick={() =>
              void form.saveDay({
                ...day,
                closed: true,
                full: false,
                notice: form.draft.notices.closedDay.text,
              })
            }
          >
            Cerrar un día
          </Button>
        )}
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

function ReceptionSwitch({
  checked,
  disabled,
  onCheckedChange,
}: {
  checked: boolean
  disabled: boolean
  onCheckedChange: (active: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={checked ? "Reservas online activas" : "Reservas online en pausa"}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-11 w-[4.75rem] shrink-0 rounded-full p-1 shadow-tactile transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60",
        checked ? "bg-status-good-solid" : "bg-olive-soft",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "block size-9 rounded-full bg-popover shadow-lift transition-transform",
          checked ? "translate-x-8" : "translate-x-0",
        )}
      />
    </button>
  )
}

export { ReservationReception }
