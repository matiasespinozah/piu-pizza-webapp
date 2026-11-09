import { Ban, CalendarCheck, CalendarClock, CheckCheck, CircleCheck, Clock, XCircle, type LucideIcon } from "lucide-react"
import { cn } from "cn"

import { statusTone, toneSoftClass } from "@/lib/reservations/status-tone"
import type { ReservationStatus } from "@/lib/reservations/types"

const statusIcon: Record<ReservationStatus, LucideIcon> = {
  pending: Clock,
  reschedule_requested: CalendarClock,
  confirmed: CalendarCheck,
  arrived: CheckCheck,
  completed: CircleCheck,
  rejected: XCircle,
  cancelled: Ban,
}

/** Pill de estado con ícono y texto: el color nunca va solo. */
function ReservationStatusBadge({
  status,
  label,
  size = "sm",
  className,
}: {
  status: ReservationStatus
  label: string
  size?: "sm" | "md"
  className?: string
}) {
  const Icon = statusIcon[status]
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full font-semibold whitespace-nowrap",
        size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-sm",
        toneSoftClass[statusTone[status]],
        className,
      )}
    >
      <Icon aria-hidden className={size === "sm" ? "size-3.5" : "size-4"} strokeWidth={2.4} />
      {label}
    </span>
  )
}

export { ReservationStatusBadge, statusIcon }
