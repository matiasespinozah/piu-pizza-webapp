"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Ban, CalendarCheck, CalendarClock, CheckCheck, CircleCheck, Info, XCircle, type LucideIcon } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { adminRequestHeader, adminRequestValue } from "@/lib/auth/session-policy"
import type { ReservationDetail } from "@/lib/reservations/views"
import type { StaffAction } from "@/lib/reservations/transitions"

const confirmLabel: Record<StaffAction, string> = {
  confirm: "Sí, confirmar",
  reject: "Sí, rechazar",
  propose: "Sí, proponer el cambio",
  reschedule: "Sí, reagendar",
  cancel: "Sí, cancelar",
  arrive: "Sí, marcar llegada",
  complete: "Sí, finalizar",
  note: "Guardar nota",
  assign: "Guardar mesa",
}

const softCapacity = new Set([
  "capacity_overlap",
  "capacity_insufficient",
  "capacity_manual",
  "capacity_daily",
  "capacity_slot",
  "capacity_table",
  "capacity_unconfigured",
  "capacity_blocked",
  "capacity_zone",
  "capacity_unreservable",
])

const fieldClass = "h-11 w-full min-w-0 rounded-xl border border-input bg-cream px-3 text-base"

function ReservationActions({ reservation }: { reservation: ReservationDetail }) {
  const router = useRouter()
  const [armed, setArmed] = useState<StaffAction | null>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState("")
  const [reason, setReason] = useState("")
  const [proposedDate, setProposedDate] = useState(reservation.proposedDate ?? reservation.date)
  const [proposedTime, setProposedTime] = useState(reservation.proposedTime ?? reservation.preferredTime)
  const [proposedZone, setProposedZone] = useState(reservation.proposedZone ?? reservation.preferredZone)
  const [tableLabel, setTableLabel] = useState(reservation.tableLabel ?? "")
  const [internalNotes, setInternalNotes] = useState(reservation.internalNotes)
  const [exceptionCode, setExceptionCode] = useState("")

  async function run(action: StaffAction, exceptionConfirmed = false) {
    if (!exceptionConfirmed && armed !== action && action !== "note" && action !== "assign") {
      setArmed(action)
      setMessage("")
      setExceptionCode("")
      return
    }
    setPending(true)
    setMessage("")
    try {
      const response = await fetch(`/api/admin/reservations/${reservation.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", [adminRequestHeader]: adminRequestValue },
        body: JSON.stringify({
          action,
          revision: reservation.revision,
          reason,
          proposedDate,
          proposedTime,
          proposedZone,
          tableLabel,
          internalNotes,
          exceptionConfirmed,
        }),
      })
      const body = (await response.json().catch(() => null)) as { message?: string; code?: string } | null
      if (!response.ok) {
        if (body?.code && softCapacity.has(body.code)) {
          setExceptionCode(body.code)
          setArmed(action)
          setMessage(`${body.message} Si ya lo evaluaste, anota el motivo y autoriza la excepción.`)
          return
        }
        setMessage(body?.message || "No se pudo guardar el cambio.")
        setArmed(null)
        setExceptionCode("")
        return
      }
      setArmed(null)
      setExceptionCode("")
      router.refresh()
    } catch {
      setMessage("No se pudo guardar el cambio. Revisa la solicitud otra vez.")
    } finally {
      setPending(false)
    }
  }

  const status = reservation.status
  const closed = status === "rejected" || status === "cancelled" || status === "completed"
  const deciding = status === "pending" || status === "reschedule_requested"

  function actionButton({
    action,
    label,
    icon: Icon,
    variant = "secondary",
    danger = false,
    className,
  }: {
    action: StaffAction
    label: string
    icon: LucideIcon
    variant?: "primary" | "secondary"
    danger?: boolean
    className?: string
  }) {
    const isArmed = armed === action
    return (
      <Button
        type="button"
        variant={variant}
        className={cn(
          "h-12 w-full",
          variant === "primary" && "h-13 text-base shadow-lift",
          danger && "text-status-closed",
          isArmed && "ring-2 ring-offset-2 ring-offset-surface-raised",
          isArmed && (danger ? "ring-status-closed" : "ring-olive"),
          className,
        )}
        disabled={pending}
        aria-pressed={isArmed}
        onClick={() => void run(action)}
      >
        <Icon aria-hidden />
        {isArmed ? confirmLabel[action] : label}
      </Button>
    )
  }

  if (closed) {
    return (
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-semibold text-olive">
          Nota interna
          <Input value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} maxLength={280} placeholder="Solo la ve el equipo" aria-label="Nota interna" className="bg-cream" />
        </label>
        <Button type="button" variant="secondary" className="h-12" disabled={pending} onClick={() => void run("note")}>
          Guardar nota
        </Button>
        {message ? <p className="text-sm font-semibold text-status-closed" role="alert">{message}</p> : null}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {status === "reschedule_requested" || armed === "propose" || armed === "reschedule" ? (
        <fieldset className="flex flex-col gap-2 rounded-2xl border border-status-waiting-solid/40 bg-status-waiting-soft/40 p-3" disabled={pending}>
          <legend className="sr-only">Otro horario</legend>
          <p className="flex items-center gap-2 text-sm font-semibold text-status-waiting">
            <CalendarClock aria-hidden className="size-4" />
            Otro horario
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={proposedDate} onChange={(event) => setProposedDate(event.target.value)} aria-label="Fecha propuesta" className="col-span-2 bg-cream" />
            <Input type="time" value={proposedTime} onChange={(event) => setProposedTime(event.target.value)} aria-label="Hora propuesta" className="bg-cream" />
            <select
              value={proposedZone}
              onChange={(event) => setProposedZone(event.target.value === "terrace" ? "terrace" : "salon")}
              aria-label="Zona propuesta"
              className={fieldClass}
            >
              <option value="salon">Salón</option>
              <option value="terrace">Terraza</option>
            </select>
          </div>
        </fieldset>
      ) : null}
      {armed === "reject" || armed === "cancel" || exceptionCode ? (
        <Input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={160} placeholder={exceptionCode ? "Por qué se autoriza la excepción" : "Motivo, opcional"} aria-label="Motivo" className="bg-cream" />
      ) : null}

      <label className="flex flex-col gap-1 text-sm font-semibold text-olive">
        Mesa, si ya la tienes
        <Input value={tableLabel} onChange={(event) => setTableLabel(event.target.value)} maxLength={40} placeholder="Opcional" aria-label="Mesa" className="bg-cream" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold text-olive">
        Nota interna
        <Input value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} maxLength={280} placeholder="Solo la ve el equipo" aria-label="Nota interna" className="bg-cream" />
      </label>

      {deciding ? actionButton({ action: "confirm", label: "Confirmar", icon: CalendarCheck, variant: "primary" }) : null}
      {status === "confirmed" ? actionButton({ action: "arrive", label: "Marcar llegada", icon: CheckCheck, variant: "primary" }) : null}
      {status === "arrived" ? actionButton({ action: "complete", label: "Finalizar atención", icon: CircleCheck, variant: "primary" }) : null}

      {status !== "arrived" ? actionButton({ action: "reschedule", label: "Reagendar", icon: CalendarClock }) : null}
      {status !== "arrived" ? actionButton({ action: "propose", label: "Proponer otro horario", icon: CalendarClock }) : null}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" className="h-12" disabled={pending} onClick={() => void run("assign")}>
          Guardar mesa
        </Button>
        <Button type="button" variant="secondary" className="h-12" disabled={pending} onClick={() => void run("note")}>
          Guardar nota
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {deciding ? actionButton({ action: "reject", label: "Rechazar", icon: XCircle, danger: true }) : null}
        {actionButton({ action: "cancel", label: "Cancelar", icon: Ban, danger: true, className: deciding ? undefined : "col-span-2" })}
      </div>

      {exceptionCode ? (
        <Button type="button" className="h-12" disabled={pending || reason.trim().length < 8} onClick={() => void run(armed ?? "confirm", true)}>
          Autorizar excepción
        </Button>
      ) : null}

      {armed ? (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-olive-hover px-3 py-2">
          <p className="text-xs text-olive-strong">Toca otra vez para confirmar. Queda registrado a tu nombre.</p>
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => setArmed(null)}>
            Volver
          </Button>
        </div>
      ) : null}
      {message ? (
        <p className="text-sm font-semibold text-status-closed" role="alert">
          {message}
        </p>
      ) : null}
      {deciding ? (
        <p className="flex items-start gap-2 text-xs text-olive-muted">
          <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          La mesa es opcional. Si no hay mesas individuales, la reserva queda en su sector. Si el cupo, el horario o una mesa chocan, anota el motivo y autoriza la excepción.
        </p>
      ) : null}
    </div>
  )
}

export { ReservationActions }
