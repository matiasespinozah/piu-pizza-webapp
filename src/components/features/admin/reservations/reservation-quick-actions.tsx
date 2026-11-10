"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarClock, Check, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { adminRequestHeader, adminRequestValue } from "@/lib/auth/session-policy"
import type { StaffAction } from "@/lib/reservations/transitions"
import type { ReservationStatus } from "@/lib/reservations/types"

function ReservationQuickActions({
  id,
  status,
  revision,
  detailHref,
}: {
  id: string
  status: ReservationStatus
  revision: number
  detailHref: string
}) {
  const router = useRouter()
  const [armed, setArmed] = useState<StaffAction | null>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState("")
  const deciding = status === "pending" || status === "reschedule_requested"
  const canArrive = status === "confirmed"

  async function run(action: StaffAction) {
    if (armed !== action) {
      setArmed(action)
      setMessage("")
      return
    }
    setPending(true)
    setMessage("")
    try {
      const response = await fetch(`/api/admin/reservations/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", [adminRequestHeader]: adminRequestValue },
        body: JSON.stringify({ action, revision, reason: "" }),
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
      setMessage("No se pudo guardar el cambio.")
    } finally {
      setPending(false)
    }
  }

  if (!deciding && !canArrive) return null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {deciding ? (
          <Button type="button" size="sm" className="h-10" disabled={pending} onClick={() => void run("confirm")}>
            <Check aria-hidden />
            {armed === "confirm" ? "Sí, confirmar" : "Confirmar"}
          </Button>
        ) : null}
        {canArrive ? (
          <Button type="button" size="sm" className="h-10" disabled={pending} onClick={() => void run("arrive")}>
            <Check aria-hidden />
            {armed === "arrive" ? "Sí, marcar llegada" : "Llegó"}
          </Button>
        ) : null}
        {deciding ? (
          <Button type="button" variant="secondary" size="sm" className="h-10 text-status-closed" disabled={pending} onClick={() => void run("reject")}>
            <X aria-hidden />
            {armed === "reject" ? "Sí, rechazar" : "Rechazar"}
          </Button>
        ) : null}
        <Button asChild variant="ghost" size="sm" className="h-10">
          <Link href={detailHref}>
            <CalendarClock aria-hidden />
            Reagendar
          </Link>
        </Button>
      </div>
      {message ? (
        <p className="text-xs font-semibold text-status-closed" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  )
}

export { ReservationQuickActions }
