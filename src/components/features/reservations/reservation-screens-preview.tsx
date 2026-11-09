"use client"

import { ReservationListCard } from "@/components/features/admin/reservations/reservation-admin-ui"
import { ReservationDetailPanel } from "@/components/features/admin/reservations/reservation-detail-panel"
import { ReservationStatusBadge } from "@/components/features/reservations/reservation-status-badge"
import { ReservationStatusCard } from "@/components/features/reservations/reservation-status-card"
import { ReservationSuccess } from "@/components/features/reservations/reservation-success"
import type { ReservationStatus } from "@/lib/reservations/types"
import { statusLabel } from "@/lib/reservations/views"

import "@/app/reservas/reservas.css"

const sampleToken = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
const statuses: ReservationStatus[] = ["pending", "reschedule_requested", "confirmed", "arrived", "completed", "rejected", "cancelled"]
const cardStatuses: ReservationStatus[] = ["pending", "confirmed", "arrived", "rejected"]

function sampleStatus(status: ReservationStatus) {
  return {
    referenceCode: "PIU-1234",
    status,
    date: "2026-11-13",
    time: "20:00",
    partySize: 4,
    zone: "terrace" as const,
    updatedAt: null,
    proposal: null,
  }
}

/** Solo para el muestrario: datos de ejemplo, sin llamadas al servidor. */
function ReservationScreensPreview() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap gap-2">
        {statuses.map((status) => (
          <ReservationStatusBadge key={status} status={status} label={statusLabel[status]} />
        ))}
      </div>

      <div className="grid max-w-xl gap-2.5">
        {statuses.map((status, index) => (
          <ReservationListCard
            key={status}
            href="#"
            selected={index === 0}
            item={{
              id: status,
              referenceCode: `PIU-10${index}2`,
              status,
              date: "2026-11-13",
              preferredTime: "20:30",
              partySize: 2 + index,
              preferredZone: index % 2 ? "terrace" : "salon",
              customerName: "Camila Rojas",
              createdAt: "2026-11-08T21:10:00.000Z",
              revision: 1,
            }}
          />
        ))}
      </div>

      <ReservationDetailPanel
        backHref="#"
        className="max-w-sm"
        detail={{
          id: "preview",
          referenceCode: "PIU-1002",
          status: "pending",
          date: "2026-11-13",
          preferredTime: "20:30",
          partySize: 4,
          preferredZone: "terrace",
          customerName: "Camila Rojas",
          createdAt: "2026-11-08T21:10:00.000Z",
          revision: 1,
          customerPhone: "+56 9 0000 0000",
          notes: "Celebramos un cumpleaños.",
          assignedTableIds: [],
          proposedDate: null,
          proposedTime: null,
          proposedZone: null,
          updatedAt: "2026-11-08T21:10:00.000Z",
          events: [{ action: "received", fromStatus: null, toStatus: "pending", actorUid: null, at: "2026-11-08T21:10:00.000Z", reason: null }],
          tracking: { state: "active", expiresOn: "2026-11-14" },
        }}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ReservationSuccess
          receipt={{ referenceCode: "PIU-1234", status: "pending", date: "2026-11-13", preferredTime: "20:00", partySize: 4, preferredZone: "terrace" }}
          trackingToken={sampleToken}
          whatsappHref="https://wa.me/56928873619"
        />
        {cardStatuses.map((status) => (
          <ReservationStatusCard
            key={status}
            status={sampleStatus(status)}
            checkedAt="20:15"
            refreshing={false}
            refreshError=""
            onRefresh={() => undefined}
          />
        ))}
      </div>
    </div>
  )
}

export { ReservationScreensPreview }
