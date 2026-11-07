import type { Metadata } from "next"

import { SiteFooter } from "@/components/features/layout/site-footer"
import { ReservationStatus } from "@/components/features/reservations/reservation-status"
import { SiteHeader } from "@/components/features/site-header"
import { Container } from "@/components/ui/layout"

export const metadata: Metadata = {
  title: "Consulta tu reserva",
  description: "Revisa el estado de tu solicitud en PIÙ Pizza & Dolce.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
}

export default function ReservationStatusPage() {
  return (
    <div data-reservation-status="" className="overflow-x-clip bg-cream">
      <SiteHeader page="reservas" />
      <main className="pt-[calc(env(safe-area-inset-top)+4.5rem)] pb-16">
        <Container className="py-8">
          <ReservationStatus />
        </Container>
      </main>
      <SiteFooter />
    </div>
  )
}
