"use client"

import { AlertCircle, BookOpen, CalendarCheck, CalendarDays, Clock, Home, Settings, UserRound, Users, UtensilsCrossed } from "lucide-react"

import { AdminDashboard } from "@/components/features/admin/admin-dashboard"
import { Logo } from "@/components/ui/logo"
import type { QuotaRow } from "@/lib/reservations/web-quota"

import "./admin-shell.css"

const rows: QuotaRow[] = ["12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"].map((time, index) => {
  const used = [2, 4, 5, 3, 2, 3, 6, 8, 9, 7, 5][index] ?? 0
  return {
    time,
    salon: { used: Math.ceil(used / 2), web: 8 },
    terrace: { used: Math.floor(used / 2), web: 6 },
  }
})

/** Solo el muestrario. Las cifras no salen de Firestore. */
function AdminDashboardPreview() {
  return (
    <div className="mx-auto w-full max-w-[390px] overflow-hidden bg-olive shadow-lift">
      <div className="flex h-[4.25rem] items-center gap-3 px-4 text-cream">
        <Logo size={36} alt="" className="rounded-full" />
        <p className="min-w-0 flex-1 font-heading text-lg leading-none font-extrabold">
          PIÙ <span className="font-semibold text-cream/80">Admin</span>
        </p>
        <span className="flex size-10 items-center justify-center rounded-full border border-cream/30">
          <UserRound aria-hidden className="size-5" />
        </span>
      </div>
      <div className="admin-sheet rounded-t-[1.75rem] px-3.5 pt-4 pb-3">
        <AdminDashboard
          today="2026-11-10"
          ready
          metrics={[
            { title: "Reservas de hoy", value: 12, icon: CalendarCheck, href: "#reservas" },
            { title: "Solicitudes pendientes", value: 5, icon: Clock, href: "#reservas" },
            { title: "Reservas confirmadas", value: 18, icon: Users, href: "#reservas" },
            { title: "Requieren atención", value: 6, icon: AlertCircle, href: "#reservas" },
          ]}
          upcoming={[
            { id: "a", referenceCode: "PIU-1001", status: "confirmed", date: "2026-11-10", preferredTime: "13:30", partySize: 4, preferredZone: "salon", customerName: "María Torres", createdAt: "2026-11-10T12:00:00.000Z", revision: 1 },
            { id: "b", referenceCode: "PIU-1002", status: "confirmed", date: "2026-11-10", preferredTime: "14:00", partySize: 2, preferredZone: "terrace", customerName: "Luis Gómez", createdAt: "2026-11-10T12:00:00.000Z", revision: 1 },
            { id: "c", referenceCode: "PIU-1003", status: "confirmed", date: "2026-11-10", preferredTime: "14:30", partySize: 6, preferredZone: "salon", customerName: "Ana Ruiz", createdAt: "2026-11-10T12:00:00.000Z", revision: 1 },
          ]}
          alerts={[
            { id: "pending", text: "5 solicitudes pendientes de confirmar.", tone: "waiting" },
            { id: "full", text: "Hoy las reservas en línea están completas.", tone: "closed" },
          ]}
          rows={rows}
          closed={false}
        />
        <nav aria-hidden className="mt-3 grid grid-cols-5 border-t border-olive-line/70 pt-1 text-[0.625rem] font-semibold text-olive-muted">
          <PreviewTab icon={Home} label="Inicio" active />
          <PreviewTab icon={CalendarDays} label="Reservas" />
          <PreviewTab icon={UtensilsCrossed} label="Mesas" />
          <PreviewTab icon={BookOpen} label="Carta" />
          <PreviewTab icon={Settings} label="Configuración" />
        </nav>
      </div>
    </div>
  )
}

function PreviewTab({ icon: Icon, label, active = false }: { icon: typeof Home; label: string; active?: boolean }) {
  return (
    <span className={`flex flex-col items-center gap-1 py-2 text-center leading-tight ${active ? "text-olive" : ""}`}>
      <span className={`flex h-8 min-w-10 items-center justify-center rounded-2xl px-2 ${active ? "bg-olive text-cream" : ""}`}>
        <Icon aria-hidden className="size-5" />
      </span>
      {label}
    </span>
  )
}

export { AdminDashboardPreview }
