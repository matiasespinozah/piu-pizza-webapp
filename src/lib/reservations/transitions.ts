import type { ReservationStatus } from "@/lib/reservations/types"

const staffActions = ["confirm", "reject", "propose", "cancel", "arrive", "complete"] as const

type StaffAction = (typeof staffActions)[number]

const allowedFrom: Record<StaffAction, readonly ReservationStatus[]> = {
  confirm: ["pending", "reschedule_requested"],
  reject: ["pending", "reschedule_requested"],
  propose: ["pending", "confirmed", "reschedule_requested"],
  cancel: ["pending", "confirmed", "reschedule_requested", "arrived"],
  arrive: ["confirmed"],
  complete: ["arrived"],
}

const nextStatus: Record<StaffAction, ReservationStatus> = {
  confirm: "confirmed",
  reject: "rejected",
  propose: "reschedule_requested",
  cancel: "cancelled",
  arrive: "arrived",
  complete: "completed",
}

function canTransition(from: ReservationStatus, action: StaffAction) {
  return allowedFrom[action].includes(from)
}

export { canTransition, nextStatus, staffActions }
export type { StaffAction }
