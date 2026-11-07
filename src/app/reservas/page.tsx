import type { Metadata } from "next"
import { connection } from "next/server"
import { Suspense } from "react"

import { FloatingWhatsApp } from "@/components/features/layout/floating-whatsapp"
import { SiteFooter } from "@/components/features/layout/site-footer"
import { ReservationForm } from "@/components/features/reservations/reservation-form"
import { ReservationHeader } from "@/components/features/reservations/reservation-header"
import { SiteHeader } from "@/components/features/site-header"
import { Container } from "@/components/ui/layout"
import { reservationWritesEnabled } from "@/lib/reservations/writes"

import "./reservas.css"

async function ReservationAvailability() {
  await connection()
  return <ReservationForm receptionEnabled={reservationWritesEnabled()} />
}

export const metadata: Metadata = {
  title: "Reservas",
  description: "Pide una mesa en PIÙ Pizza & Dolce. Revisamos cada solicitud antes de confirmarla.",
  openGraph: {
    title: "Reservas · PIÙ",
    description: "Elige cuándo quieres venir y nosotros revisaremos tu solicitud.",
    locale: "es_CL",
    type: "website",
  },
}

export default function ReservasPage() {
  return (
    <div data-reservation-page="" className="bg-cream">
      <SiteHeader page="reservas" />
      <FloatingWhatsApp />
      <div className="overflow-x-clip">
        <main className="pt-[calc(env(safe-area-inset-top)+4.5rem)] pb-10 md:pb-16">
          <Container className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(20rem,36rem)] lg:items-start lg:justify-center lg:gap-16 lg:py-6">
            <ReservationHeader />
            <Suspense fallback={<ReservationForm receptionEnabled={false} />}>
              <ReservationAvailability />
            </Suspense>
          </Container>
        </main>
        <SiteFooter />
      </div>
    </div>
  )
}
