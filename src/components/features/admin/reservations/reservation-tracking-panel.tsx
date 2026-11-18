"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Link2 } from "lucide-react"

import { DetailSection } from "@/components/features/admin/reservations/reservation-admin-ui"
import { Button } from "@/components/ui/button"
import { adminRequestHeader, adminRequestValue } from "@/lib/auth/session-policy"
import { trackingHref } from "@/lib/reservations/tracking-link"
import type { ReservationDetail } from "@/lib/reservations/views"

function ReservationTrackingPanel({ reservation }: { reservation: ReservationDetail }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState("")
  const [link, setLink] = useState("")

  async function copyLink() {
    setPending(true)
    setMessage("")
    try {
      const response = await fetch(`/api/admin/reservations/${reservation.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", [adminRequestHeader]: adminRequestValue },
        body: JSON.stringify({ action: "share_tracking", revision: reservation.revision }),
      })
      const body = (await response.json().catch(() => null)) as { message?: string; trackingToken?: string } | null
      if (!response.ok || typeof body?.trackingToken !== "string") {
        setMessage(body?.message || "No se pudo copiar el enlace.")
        return
      }
      const url = new URL(trackingHref(body.trackingToken), window.location.origin).href
      setLink(url)
      try {
        await navigator.clipboard.writeText(url)
        setMessage("Enlace copiado. Pégalo en un correo o en WhatsApp.")
      } catch {
        setMessage("No se pudo copiar solo. Selecciona el enlace y cópialo.")
      }
      router.refresh()
    } catch {
      setMessage("No se pudo copiar el enlace.")
    } finally {
      setPending(false)
    }
  }

  return (
    <DetailSection icon={Link2} title="Seguimiento del cliente">
      <Button type="button" variant="secondary" className="h-12 w-full" disabled={pending} onClick={() => void copyLink()}>
        <Link2 aria-hidden />
        Copiar enlace de seguimiento
      </Button>
      {link ? <p className="text-sm break-all text-olive-strong">{link}</p> : null}
      {message ? <p className="text-sm font-semibold text-olive">{message}</p> : null}
    </DetailSection>
  )
}

export { ReservationTrackingPanel }
