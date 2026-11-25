import type { Metadata } from "next"
import { connection } from "next/server"
import { Suspense } from "react"

import { FloatingWhatsApp } from "@/components/features/layout/floating-whatsapp"
import { PublicSiteFooter } from "@/components/features/layout/public-site-footer"
import { ReservationVisitMeter } from "@/components/features/metrics/visit-meter"
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
  alternates: { canonical: "/reservas" },
  openGraph: {
    url: "/reservas",
    images: [{ url: "/opengraph-image.jpg", width: 1200, height: 630, alt: "El local de PIÙ Pizza & Dolce" }],
    title: "Reservas · PIÙ",
    description: "Elige cuándo quieres venir y nosotros revisaremos tu solicitud.",
    locale: "es_CL",
    type: "website",
  },
}

/**
 * Lugar del formulario mientras se lee la configuración. Antes mostraba la tarjeta de
 * «reservas no disponibles», que era falsa para quien sí puede reservar, y era mucho más baja
 * que el formulario: al llegar este, empujaba el pie de página (CLS 0,19).
 * La altura es la del formulario en el paso 1.
 */
function ReservationFormFallback() {
  return (
    <section
      aria-busy="true"
      aria-label="Cargando el formulario de reservas"
      className="min-h-[32.5rem] rounded-3xl border border-olive-line bg-surface-raised px-5 py-8 shadow-lift"
    >
      <p className="text-base text-olive-muted">Preparando tu reserva…</p>
    </section>
  )
}

export default function ReservasPage() {
  return (
    <div data-reservation-page="" className="bg-cream">
      <SiteHeader page="reservas" />
      <ReservationVisitMeter />
      <FloatingWhatsApp />
      <div className="overflow-x-clip">
        <main className="pt-[calc(env(safe-area-inset-top)+4.5rem)] pb-10 md:pb-16">
          <Container className="reservation-layout grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(20rem,36rem)] lg:items-start lg:justify-center lg:gap-16 lg:py-6">
            <ReservationHeader />
            <Suspense fallback={<ReservationFormFallback />}>
              <ReservationAvailability />
            </Suspense>
          </Container>
        </main>
        <PublicSiteFooter />
      </div>
    </div>
  )
}
