"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { adminRequestHeader, adminRequestValue } from "@/lib/auth/session-policy"
import { criticalFingerprint, type FloorSection, type OperationRules } from "@/lib/reservations/operations"
import type { DayOverride } from "@/lib/reservations/day-policy"
import type { Weekday } from "@/lib/reservations/schedule"

const dayLabels: { id: Weekday; label: string }[] = [
  { id: "mon", label: "Lunes" },
  { id: "tue", label: "Martes" },
  { id: "wed", label: "Miércoles" },
  { id: "thu", label: "Jueves" },
  { id: "fri", label: "Viernes" },
  { id: "sat", label: "Sábado" },
  { id: "sun", label: "Domingo" },
]

function rulesPayload(next: OperationRules) {
  return {
    serviceMinutes: next.serviceMinutes,
    receptionPaused: next.receptionPaused,
    fullNotice: next.notices.full.text.trim(),
    pausedNotice: next.notices.paused.text.trim(),
    closedDayNotice: next.notices.closedDay.text.trim(),
    venueClosedNotice: next.notices.venueClosed.text.trim(),
    sectors: next.sectors,
    week: next.week,
  }
}

function sectorProblem(sectors: OperationRules["sectors"]) {
  if (sectors.salon.web > sectors.salon.total) return "En el salón hay más mesas para la web que mesas en total."
  if (sectors.terrace.web > sectors.terrace.total) return "En la terraza hay más mesas para la web que mesas en total."
  return ""
}

function whole(value: string, fallback: number) {
  if (value.trim() === "") return 0
  const number = Number(value)
  return Number.isInteger(number) && number >= 0 && number <= 40 ? number : fallback
}

function useTablesDraft(rules: OperationRules, confirmedCount: number, preview: boolean) {
  const router = useRouter()
  const [draft, setDraft] = useState(rules)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  const [confirmCritical, setConfirmCritical] = useState(false)

  async function post(body: unknown) {
    const response = await fetch("/api/admin/tables", {
      method: "POST",
      headers: { "content-type": "application/json", [adminRequestHeader]: adminRequestValue },
      body: JSON.stringify(body),
    })
    const payload = (await response.json().catch(() => null)) as { message?: string } | null
    if (!response.ok) {
      setError(payload?.message ?? "No se pudo guardar.")
      return false
    }
    return true
  }

  async function save(next: OperationRules, section: FloorSection, force = false) {
    const problem = sectorProblem(next.sectors)
    if (problem || next.serviceMinutes === null || next.serviceMinutes < 30 || next.serviceMinutes > 300) {
      setError(problem || "La duración tiene que estar entre 30 y 300 minutos.")
      return
    }
    for (const notice of [next.notices.full, next.notices.paused, next.notices.closedDay, next.notices.venueClosed]) {
      if (notice.text.trim().length < 8) {
        setError("Cada mensaje al cliente necesita al menos 8 caracteres.")
        return
      }
    }
    const affectsConfirmed = confirmedCount > 0 && criticalFingerprint(next) !== criticalFingerprint(rules)
    if (affectsConfirmed && !force && !confirmCritical) {
      setConfirmCritical(true)
      setMessage("Hay reservas confirmadas. Este cambio no las cancela. Pulsa guardar otra vez para aplicarlo.")
      return
    }
    setConfirmCritical(false)
    setPending(true)
    setError("")
    if (preview) {
      setDraft(next)
      setPending(false)
      setMessage("Vista previa. Aquí no se escribe en Firestore.")
      return
    }
    const saved = await post({ action: "save", section, rules: rulesPayload(next) })
    setPending(false)
    if (!saved) return
    setDraft(next)
    setMessage(next.receptionPaused ? "Recepción en pausa. Las reservas ya hechas siguen en el panel." : "Configuración guardada.")
    router.refresh()
  }

  async function saveDay(next: DayOverride) {
    if (next.closed && next.full) {
      setError("Ese día ya está cerrado. No hace falta marcarlo completo.")
      return
    }
    setPending(true)
    setError("")
    if (preview) {
      setPending(false)
      setMessage("Vista previa. El día no se guardó.")
      return
    }
    const saved = await post({ action: "save-day", day: next })
    setPending(false)
    if (!saved) return
    setMessage(next.full ? "Ese día quedó marcado como completo." : "Ese día vuelve a aceptar reservas.")
    router.refresh()
  }

  return { draft, setDraft, message, error, pending, confirmCritical, save, saveDay }
}

export { dayLabels, sectorProblem, useTablesDraft, whole }
