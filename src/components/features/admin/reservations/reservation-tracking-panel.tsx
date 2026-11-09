"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Link2, Link2Off, RefreshCw } from "lucide-react"
import { cn } from "cn"

import { DetailSection } from "@/components/features/admin/reservations/reservation-admin-ui"
import { CopyTrackingLink } from "@/components/features/reservations/reservation-tracking-actions"
import { Button } from "@/components/ui/button"
import { formatVisitDate } from "@/lib/reservations/schedule"
import type { ReservationDetail } from "@/lib/reservations/views"

function trackingView(tracking: ReservationDetail["tracking"]) {
  const until = "expiresOn" in tracking && tracking.expiresOn ? formatVisitDate(tracking.expiresOn) : "—"
  if (tracking.state === "missing") return { pill: "Sin enlace", detail: "Esta solicitud no tiene enlace de seguimiento.", tone: "bg-olive-hover text-olive-strong" }
  if (tracking.state === "revoked") return { pill: "Revocado", detail: "El enlace fue revocado.", tone: "bg-status-closed-soft text-status-closed" }
  if (tracking.state === "expired") return { pill: "Vencido", detail: `Venció el ${until}.`, tone: "bg-status-waiting-soft text-status-waiting" }
  return { pill: "Vigente", detail: `Sirve hasta el ${until}.`, tone: "bg-status-good-soft text-status-good" }
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

  const view = trackingView(reservation.tracking)

  return (
    <DetailSection
      icon={Link2}
      title="Seguimiento del cliente"
      aside={<span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", view.tone)}>{view.pill}</span>}
    >
      <p className="text-sm text-olive-strong">{view.detail}</p>
      {issued ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-status-good-solid/40 bg-status-good-soft/50 p-3">
          <p className="text-sm font-semibold text-status-good">Enlace nuevo. Cópialo ahora: no queda guardado en el panel.</p>
          <CopyTrackingLink token={issued} />
          <Button type="button" variant="secondary" className="h-12 w-full" onClick={() => setIssued(null)}>
            Ya lo anoté
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              className={cn("h-12", armed === "issue_tracking" && "ring-2 ring-olive ring-offset-2 ring-offset-surface-raised")}
              disabled={pending}
              aria-pressed={armed === "issue_tracking"}
              onClick={() => void run("issue_tracking")}
            >
              <RefreshCw aria-hidden />
              {armed === "issue_tracking" ? "Sí, generar" : "Generar enlace"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className={cn(
                "h-12 text-status-closed",
                armed === "revoke_tracking" && "ring-2 ring-status-closed ring-offset-2 ring-offset-surface-raised",
              )}
              disabled={pending || reservation.tracking.state === "missing"}
              aria-pressed={armed === "revoke_tracking"}
              onClick={() => void run("revoke_tracking")}
            >
              <Link2Off aria-hidden />
              {armed === "revoke_tracking" ? "Sí, revocar" : "Revocar"}
            </Button>
          </div>
          <p className="text-xs text-olive-muted">
            {armed
              ? "Toca otra vez para confirmar."
              : "El enlace no se puede recuperar. Si se perdió, genera otro: el anterior deja de servir."}
          </p>
        </>
      )}
      {message ? (
        <p className="text-sm font-semibold text-status-closed" role="alert">
          {message}
        </p>
      ) : null}
    </DetailSection>
  )
}

export { ReservationTrackingPanel }
