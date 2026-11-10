import type { Metadata } from "next"
import { AlertCircle, CalendarCheck, Clock, Users } from "lucide-react"

import { AdminDashboard, alertItems, type Metric } from "@/components/features/admin/admin-dashboard"
import { todayIsoInSantiago } from "@/lib/reservations/schedule"
import { webQuotaRows } from "@/lib/reservations/web-quota"
import { requireSection } from "@/server/auth/access"
import { readFloor } from "@/server/operations/service"
import { listReservationsForStaff, reservationSummary } from "@/server/reservations/service"

export const instant = false

export const metadata: Metadata = {
  title: "Inicio",
  robots: { index: false, follow: false },
}

export default async function AdminHomePage() {
  const session = await requireSection("inicio")
  const today = todayIsoInSantiago()
  const [reservations, upcoming, floor] = await Promise.all([
    reservationSummary(session),
    listReservationsForStaff(session, { view: "upcoming" }),
    readFloor(session, today).catch(() => null),
  ])
  const summary = reservations.summary
  const metrics: Metric[] = [
    { title: "Reservas de hoy", value: summary?.confirmedToday ?? null, icon: CalendarCheck, href: "/admin/reservas?view=today" },
    { title: "Solicitudes pendientes", value: summary?.pending ?? null, icon: Clock, href: "/admin/reservas?view=pending" },
    { title: "Reservas confirmadas", value: summary?.upcoming ?? null, icon: Users, href: "/admin/reservas?view=upcoming" },
    { title: "Requieren atención", value: summary?.attention ?? null, icon: AlertCircle, href: "/admin/reservas?view=attention" },
  ]
  const rows =
    floor && !floor.day.closed
      ? webQuotaRows({
          date: today,
          week: floor.rules.week,
          serviceMinutes: floor.rules.serviceMinutes,
          web: { salon: floor.rules.sectors.salon.web, terrace: floor.rules.sectors.terrace.web },
          bookings: floor.bookings,
          visit: floor.day,
        })
      : null
  const alerts = floor
    ? alertItems({
        paused: floor.rules.receptionPaused,
        closed: floor.day.closed,
        full: floor.day.full,
        pending: summary?.pending ?? null,
      })
    : summary?.pending
      ? alertItems({ paused: false, closed: false, full: false, pending: summary.pending })
      : []
  const nextItems = upcoming.ready ? upcoming.items.filter((item) => item.status === "confirmed").slice(0, 3) : []

  return (
    <AdminDashboard
      today={today}
      ready={reservations.ready}
      metrics={metrics}
      upcoming={nextItems}
      alerts={alerts}
      rows={rows}
      closed={Boolean(floor?.day.closed)}
    />
  )
}
