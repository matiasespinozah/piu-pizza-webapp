"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Ban, CalendarCheck, CalendarClock, CheckCheck, CircleCheck, Info, XCircle, type LucideIcon } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ReservationDetail } from "@/lib/reservations/views"
import type { StaffAction } from "@/lib/reservations/transitions"

const confirmLabel: Record<StaffAction, string> = {
  confirm: "Sí, confirmar",
  reject: "Sí, rechazar",
  propose: "Sí, proponer el cambio",
  cancel: "Sí, cancelar",
  arrive: "Sí, marcar llegada",
  complete: "Sí, finalizar",
}

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

  async function run(action: StaffAction) {
    if (armed !== action) {
      setArmed(action)
      setMessage("")
      return
    }
    setPending(true)
    setMessage("")
    try {
      const response = await fetch(`/api/admin/reservations/${reservation.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-piu-requested-with": "admin-login",
        },
        body: JSON.stringify({
          action,
          revision: reservation.revision,
          reason,
          proposedDate,
          proposedTime,
          proposedZone,
        }),
      })
      const body = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setMessage(body?.message || "No se pudo guardar el cambio.")
        setArmed(null)
        return
      }
      setArmed(null)
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
    return <p className="text-sm text-olive-muted">Esta solicitud está cerrada. No quedan acciones.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {status === "reschedule_requested" || armed === "propose" ? (
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
      {armed === "reject" || armed === "cancel" ? (
        <Input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={160} placeholder="Motivo, opcional" aria-label="Motivo" className="bg-cream" />
      ) : null}

      {deciding ? actionButton({ action: "confirm", label: "Confirmar", icon: CalendarCheck, variant: "primary" }) : null}
      {status === "confirmed" ? actionButton({ action: "arrive", label: "Marcar llegada", icon: CheckCheck, variant: "primary" }) : null}
      {status === "arrived" ? actionButton({ action: "complete", label: "Finalizar atención", icon: CircleCheck, variant: "primary" }) : null}

      {status !== "arrived" ? actionButton({ action: "propose", label: "Proponer otro horario", icon: CalendarClock }) : null}
      <div className="grid grid-cols-2 gap-2">
        {deciding ? actionButton({ action: "reject", label: "Rechazar", icon: XCircle, danger: true }) : null}
        {actionButton({ action: "cancel", label: "Cancelar", icon: Ban, danger: true, className: deciding ? undefined : "col-span-2" })}
      </div>

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
          Confirmar exige una mesa válida y la configuración de mesas completa. Si no la hay, sigue pendiente.
        </p>
      ) : null}
    </div>
  )
}

export { ReservationActions }
