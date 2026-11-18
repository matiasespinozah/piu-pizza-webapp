"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Ban, CalendarCheck, CalendarClock, CheckCheck, CircleCheck, XCircle, type LucideIcon } from "lucide-react"
import { cn } from "cn"

import { ReservationRescheduleSheet } from "@/components/features/admin/reservations/reservation-reschedule-sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { adminRequestHeader, adminRequestValue } from "@/lib/auth/session-policy"
import type { ReservationDetail } from "@/lib/reservations/views"
import type { StaffAction } from "@/lib/reservations/transitions"

const confirmLabel: Partial<Record<StaffAction, string>> = {
  confirm: "Sí, confirmar",
  reject: "Sí, rechazar",
  cancel: "Sí, cancelar",
  arrive: "Sí, marcar llegada",
  complete: "Sí, finalizar",
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

function ReservationActions({ reservation }: { reservation: ReservationDetail }) {
  const router = useRouter()
  const [armed, setArmed] = useState<StaffAction | null>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState("")
  const [reason, setReason] = useState("")
  const [exceptionCode, setExceptionCode] = useState("")
  const [rescheduleOpen, setRescheduleOpen] = useState(false)

  async function run(action: StaffAction, exceptionConfirmed = false) {
    if (!exceptionConfirmed && armed !== action) {
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
  const finished = status === "cancelled" || status === "completed"
  const canConfirm = status === "pending" || status === "reschedule_requested" || status === "rejected"
  const canReschedule = !finished && status !== "arrived"
  const canReject = status === "pending" || status === "reschedule_requested"
  const canCancel = status === "pending" || status === "confirmed" || status === "reschedule_requested" || status === "arrived"

  function actionButton({
    action,
    label,
    icon: Icon,
    variant = "secondary",
    danger = false,
  }: {
    action: StaffAction
    label: string
    icon: LucideIcon
    variant?: "primary" | "secondary"
    danger?: boolean
  }) {
    const isArmed = armed === action
    return (
      <Button
        type="button"
        variant={variant}
        className={cn("h-12 w-full", danger && "text-status-closed", isArmed && "ring-2 ring-offset-2 ring-offset-surface-raised", isArmed && (danger ? "ring-status-closed" : "ring-olive"))}
        disabled={pending}
        aria-pressed={isArmed}
        onClick={() => void run(action)}
      >
        <Icon aria-hidden />
        {isArmed ? confirmLabel[action] : label}
      </Button>
    )
  }

  if (finished) return null

  return (
    <div className="flex flex-col gap-3">
      {armed === "reject" || armed === "cancel" || exceptionCode ? (
        <Input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={160} placeholder={exceptionCode ? "Por qué se autoriza la excepción" : "Motivo, opcional"} aria-label="Motivo" className="bg-cream" />
      ) : null}

      {canConfirm ? actionButton({ action: "confirm", label: "Confirmar", icon: CalendarCheck, variant: "primary" }) : null}
      {status === "confirmed" ? actionButton({ action: "arrive", label: "Marcar llegada", icon: CheckCheck, variant: "primary" }) : null}
      {status === "arrived" ? actionButton({ action: "complete", label: "Finalizar atención", icon: CircleCheck, variant: "primary" }) : null}
      {canReschedule ? (
        <Button type="button" variant="secondary" className="h-12 w-full" disabled={pending} onClick={() => setRescheduleOpen(true)}>
          <CalendarClock aria-hidden />
          Reagendar
        </Button>
      ) : null}
      <ReservationRescheduleSheet
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        id={reservation.id}
        revision={reservation.revision}
        referenceCode={reservation.referenceCode}
        customerName={reservation.customerName}
        partySize={reservation.partySize}
        date={reservation.date}
        time={reservation.preferredTime}
        zone={reservation.preferredZone}
      />

      {canReject || canCancel ? (
        <div className="grid grid-cols-2 gap-2">
          {canReject ? actionButton({ action: "reject", label: "Rechazar", icon: XCircle, danger: true }) : null}
          {canCancel ? actionButton({ action: "cancel", label: "Cancelar", icon: Ban, danger: true }) : null}
        </div>
      ) : null}

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
    </div>
  )
}

export { ReservationActions }
