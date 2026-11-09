import type { ReservationStatus } from "@/lib/reservations/types"

/** Familia visual de cada estado. Los colores viven en DESIGN.md §2 · Colores de estado. */
type StatusTone = "waiting" | "good" | "done" | "rejected" | "neutral"

const statusTone: Record<ReservationStatus, StatusTone> = {
  pending: "waiting",
  reschedule_requested: "waiting",
  confirmed: "good",
  arrived: "done",
  completed: "done",
  rejected: "rejected",
  cancelled: "neutral",
}

/** Pill o bloque suave: texto oscuro sobre fondo claro del mismo tono. */
const toneSoftClass: Record<StatusTone, string> = {
  waiting: "bg-status-waiting-soft text-status-waiting",
  good: "bg-status-good-soft text-status-good",
  done: "bg-status-done-solid text-cream",
  rejected: "bg-status-closed-soft text-status-closed",
  neutral: "bg-olive-hover text-olive-strong",
}

/** Círculo de ícono lleno. */
const toneSolidClass: Record<StatusTone, string> = {
  waiting: "bg-status-waiting-solid text-olive",
  good: "bg-status-good-solid text-cream",
  done: "bg-status-done-solid text-cream",
  rejected: "bg-status-closed text-cream",
  neutral: "bg-olive-muted text-cream",
}

export type { StatusTone }
export { statusTone, toneSoftClass, toneSolidClass }
