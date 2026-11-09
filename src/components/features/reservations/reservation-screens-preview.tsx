"use client"

import { ReservationStatusCard } from "@/components/features/reservations/reservation-status-card"
import { ReservationSuccess } from "@/components/features/reservations/reservation-success"

import "@/app/reservas/reservas.css"

const sampleToken = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

/** Solo para el muestrario: datos de ejemplo, sin llamadas al servidor. */
function ReservationScreensPreview() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ReservationSuccess
        receipt={{ referenceCode: "PIU-1234", status: "pending", date: "2026-11-13", preferredTime: "20:00", partySize: 4, preferredZone: "terrace" }}
        trackingToken={sampleToken}
        whatsappHref="https://wa.me/56928873619"
      />
      <ReservationStatusCard
        status={{
          referenceCode: "PIU-1234",
          status: "confirmed",
          date: "2026-11-13",
          time: "20:00",
          partySize: 4,
          zone: "terrace",
          updatedAt: null,
          proposal: null,
        }}
        checkedAt="20:15"
        refreshing={false}
        refreshError=""
        onRefresh={() => undefined}
      />
    </div>
  )
}

export { ReservationScreensPreview }
