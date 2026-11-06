import { zoneConfig } from "@/lib/reservations/configuration"
import { formatVisitDate } from "@/lib/reservations/schedule"
import type { ReservationDraft } from "@/lib/reservations/types"

function ReservationSummary({ draft, phone }: { draft: ReservationDraft; phone: string }) {
  const zone = draft.zone ? zoneConfig(draft.zone).label : ""
  const notes = draft.notes.trim()
  const when = [draft.date ? formatVisitDate(draft.date) : "", draft.preferredTime].filter(Boolean).join(" · ")
  const who = [`${draft.partySize} ${draft.partySize === 1 ? "persona" : "personas"}`, zone].filter(Boolean).join(" · ")

  return (
    <section aria-label="Resumen de la solicitud" className="rounded-2xl bg-cream px-4 py-3 text-olive">
      <p className="font-heading text-lg leading-snug font-bold">{when}</p>
      <p className="mt-1 text-sm">{who}</p>
      {draft.customerName.trim() ? <p className="mt-2 text-sm">{draft.customerName.trim()}</p> : null}
      {phone ? <p className="text-sm">{phone}</p> : null}
      {notes ? <p className="mt-2 text-sm text-olive-strong">{notes}</p> : null}
    </section>
  )
}

export { ReservationSummary }
