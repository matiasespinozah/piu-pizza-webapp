"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { CopyTrackingLink } from "@/components/features/reservations/reservation-tracking-actions"
import { Button } from "@/components/ui/button"
import { formatVisitDate } from "@/lib/reservations/schedule"
import type { ReservationDetail } from "@/lib/reservations/views"

function trackingLabel(tracking: ReservationDetail["tracking"]) {
  if (tracking.state === "missing") return "Esta solicitud no tiene enlace de seguimiento."
  if (tracking.state === "revoked") return "El enlace de seguimiento fue revocado."
  if (tracking.state === "expired") return `El enlace venció el ${tracking.expiresOn ? formatVisitDate(tracking.expiresOn) : "—"}.`
  return `El enlace está vigente hasta el ${tracking.expiresOn ? formatVisitDate(tracking.expiresOn) : "—"}.`
}

function ReservationTrackingPanel({ reservation }: { reservation: ReservationDetail }) {
  const router = useRouter()
  const [armed, setArmed] = useState<"issue_tracking" | "revoke_tracking" | null>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState("")
  const [issued, setIssued] = useState<string | null>(null)

  async function run(action: "issue_tracking" | "revoke_tracking") {
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
        body: JSON.stringify({ action, revision: reservation.revision }),
      })
      const body = (await response.json().catch(() => null)) as { message?: string; trackingToken?: string } | null
      if (!response.ok) {
        setMessage(body?.message || "No se pudo actualizar el enlace.")
        setArmed(null)
        return
      }
      setArmed(null)
      setIssued(typeof body?.trackingToken === "string" ? body.trackingToken : null)
      router.refresh()
    } catch {
      setMessage("No se pudo actualizar el enlace. Revisa la solicitud otra vez.")
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="flex flex-col gap-3 border-t border-olive-line pt-4">
      <h3 className="font-heading text-base font-bold">Seguimiento del cliente</h3>
      <p className="text-sm text-olive-muted">{trackingLabel(reservation.tracking)}</p>
      <p className="text-sm text-olive-muted">
        El enlace no se puede reconstruir. Si la persona lo perdió, genera otro: el anterior deja de servir. Léelo una sola vez.
      </p>
      {issued ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-olive">Enlace nuevo. Cópialo ahora. No queda guardado en el panel.</p>
          <CopyTrackingLink token={issued} />
          <Button type="button" variant="secondary" className="h-12 w-full" onClick={() => setIssued(null)}>
            Ya lo anoté
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button type="button" variant="secondary" className="h-12" disabled={pending} onClick={() => void run("issue_tracking")}>
            {armed === "issue_tracking" ? "Sí, generar otro enlace" : "Generar enlace"}
          </Button>
          <Button type="button" variant="secondary" className="h-12" disabled={pending || reservation.tracking.state === "missing"} onClick={() => void run("revoke_tracking")}>
            {armed === "revoke_tracking" ? "Sí, revocar el enlace" : "Revocar enlace"}
          </Button>
        </div>
      )}
      {message ? <p className="text-sm text-olive-strong">{message}</p> : null}
    </section>
  )
}

export { ReservationTrackingPanel }
