import Link from "next/link"
import { ArrowLeft, CalendarDays, Contact, History, MessageSquareText, Phone, Table2, Zap } from "lucide-react"
import { cn } from "cn"

import { DetailFact, DetailSection, ReservationHistory } from "@/components/features/admin/reservations/reservation-admin-ui"
import { ReservationActions } from "@/components/features/admin/reservations/reservation-actions"
import { ReservationTrackingPanel } from "@/components/features/admin/reservations/reservation-tracking-panel"
import { ReservationStatusBadge } from "@/components/features/reservations/reservation-status-badge"
import { Button } from "@/components/ui/button"
import { zoneConfig } from "@/lib/reservations/configuration"
import { formatVisitDate } from "@/lib/reservations/schedule"
import type { ReservationDetail } from "@/lib/reservations/views"
import { statusLabel } from "@/lib/reservations/views"

const actionLabel: Record<string, string> = {
  received: "Recibida",
  confirm: "Confirmó",
  reject: "Rechazó",
  propose: "Propuso un cambio",
  cancel: "Canceló",
  arrive: "Marcó llegada",
  complete: "Finalizó",
  tracking_issued: "Generó un enlace",
  tracking_revoked: "Revocó el enlace",
}

/** Ficha de una solicitud: visita, contacto, observaciones, mesa, acciones, seguimiento e historial. */
function ReservationDetailPanel({ detail, backHref, className }: { detail: ReservationDetail; backHref: string; className?: string }) {
  return (
    <article id="detalle" className={cn("scroll-mt-4 overflow-hidden rounded-3xl border border-olive-line bg-surface-raised shadow-lift", className)}>
      <header className="flex flex-col gap-3 bg-olive px-4 py-4 text-cream sm:px-5">
        <Link
          href={backHref}
          className="inline-flex h-8 items-center gap-1 self-start rounded-full text-xs font-semibold text-cream/80 underline-offset-4 hover:underline lg:hidden"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          Volver a la lista
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-heading text-2xl leading-tight font-extrabold break-words">{detail.customerName}</h2>
            <p className="mt-0.5 font-label text-xs tracking-[0.14em] text-cream/70">{detail.referenceCode}</p>
          </div>
          <ReservationStatusBadge status={detail.status} label={statusLabel[detail.status]} size="md" />
        </div>
      </header>

      <DetailSection icon={CalendarDays} title="Visita">
        <dl className="grid grid-cols-2 gap-2">
          <DetailFact label="Fecha" value={formatVisitDate(detail.date)} wide />
          <DetailFact label="Hora" value={detail.preferredTime} />
          <DetailFact label="Personas" value={String(detail.partySize)} />
          <DetailFact label="Zona" value={zoneConfig(detail.preferredZone).label} wide />
        </dl>
      </DetailSection>

      <DetailSection icon={Contact} title="Contacto">
        <div className="flex items-center justify-between gap-3 rounded-xl bg-cream p-2 pl-3">
          <p className="min-w-0 truncate font-heading text-base font-bold text-olive">{detail.customerPhone}</p>
          <Button asChild className="h-11 shrink-0 rounded-xl bg-status-done-solid hover:bg-status-done-solid/90">
            <a href={`tel:${detail.customerPhone.replaceAll(" ", "")}`}>
              <Phone aria-hidden />
              Llamar
            </a>
          </Button>
        </div>
        <p className="text-xs text-olive-muted">Abre el teléfono. No avisa al cliente ni lo marca como avisado.</p>
      </DetailSection>

      <DetailSection icon={MessageSquareText} title="Observaciones">
        {detail.notes ? (
          <p className="rounded-xl border-l-2 border-terracotta bg-cream px-3 py-2.5 text-sm whitespace-pre-line text-olive-strong">{detail.notes}</p>
        ) : (
          <p className="text-sm text-olive-muted">Sin observaciones.</p>
        )}
      </DetailSection>

      <DetailSection icon={Table2} title="Mesa asignada">
        {detail.assignedTableIds.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {detail.assignedTableIds.map((id) => (
              <li key={id} className="rounded-lg bg-olive px-2.5 py-1 font-label text-xs font-semibold text-cream">
                {id}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-olive-muted">Todavía no hay mesa.</p>
        )}
      </DetailSection>

      <DetailSection icon={Zap} title="Acciones">
        <ReservationActions reservation={detail} />
      </DetailSection>

      <ReservationTrackingPanel reservation={detail} />

      <DetailSection icon={History} title="Historial">
        <ReservationHistory events={detail.events} actionLabel={actionLabel} />
      </DetailSection>
    </article>
  )
}

export { ReservationDetailPanel }
