"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

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

  const closed = reservation.status === "rejected" || reservation.status === "cancelled" || reservation.status === "completed"

  return (
    <div className="flex flex-col gap-3">
      {reservation.status === "reschedule_requested" || armed === "propose" ? (
        <fieldset className="flex flex-col gap-2" disabled={pending}>
          <legend className="text-sm font-semibold">Otro horario</legend>
          <Input type="date" value={proposedDate} onChange={(event) => setProposedDate(event.target.value)} aria-label="Fecha propuesta" />
          <Input type="time" value={proposedTime} onChange={(event) => setProposedTime(event.target.value)} aria-label="Hora propuesta" />
          <select
            value={proposedZone}
            onChange={(event) => setProposedZone(event.target.value === "terrace" ? "terrace" : "salon")}
            aria-label="Zona propuesta"
            className="h-11 rounded-lg border border-input bg-transparent px-3 text-base"
          >
            <option value="salon">Salón</option>
            <option value="terrace">Terraza</option>
          </select>
        </fieldset>
      ) : null}
      {armed === "reject" || armed === "cancel" ? (
        <Input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={160}
          placeholder="Motivo, opcional"
          aria-label="Motivo"
        />
      ) : null}
      <div className="grid grid-cols-1 gap-2">
        {reservation.status === "pending" || reservation.status === "reschedule_requested" ? (
          <Button type="button" className="h-12" disabled={pending} onClick={() => void run("confirm")}>
            {armed === "confirm" ? confirmLabel.confirm : "Confirmar"}
          </Button>
        ) : null}
        {reservation.status === "pending" || reservation.status === "reschedule_requested" ? (
          <Button type="button" variant="secondary" className="h-12" disabled={pending} onClick={() => void run("reject")}>
            {armed === "reject" ? confirmLabel.reject : "Rechazar"}
          </Button>
        ) : null}
        {!closed && reservation.status !== "arrived" ? (
          <Button type="button" variant="secondary" className="h-12" disabled={pending} onClick={() => void run("propose")}>
            {armed === "propose" ? confirmLabel.propose : "Proponer otro horario"}
          </Button>
        ) : null}
        {!closed && reservation.status !== "rejected" ? (
          <Button type="button" variant="secondary" className="h-12" disabled={pending} onClick={() => void run("cancel")}>
            {armed === "cancel" ? confirmLabel.cancel : "Cancelar"}
          </Button>
        ) : null}
        {reservation.status === "confirmed" ? (
          <Button type="button" variant="secondary" className="h-12" disabled={pending} onClick={() => void run("arrive")}>
            {armed === "arrive" ? confirmLabel.arrive : "Marcar llegada"}
          </Button>
        ) : null}
        {reservation.status === "arrived" ? (
          <Button type="button" variant="secondary" className="h-12" disabled={pending} onClick={() => void run("complete")}>
            {armed === "complete" ? confirmLabel.complete : "Finalizar atención"}
          </Button>
        ) : null}
      </div>
      {armed ? <p className="text-sm text-olive-muted">Esta acción queda registrada a tu nombre.</p> : null}
      {message ? (
        <p className="text-sm font-semibold text-terracotta" role="alert">
          {message}
        </p>
      ) : null}
      <p className="text-sm text-olive-muted">
        Falta la distribución real de mesas, la duración y las mesas que se pueden juntar. Sin eso, confirmar queda bloqueado.
      </p>
    </div>
  )
}

export { ReservationActions }
