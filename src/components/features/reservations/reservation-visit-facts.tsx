import { CalendarDays, Clock, MapPin, Users, type LucideIcon } from "lucide-react"

import { zoneConfig } from "@/lib/reservations/configuration"
import { formatVisitDate } from "@/lib/reservations/schedule"
import type { ReservationZone } from "@/lib/reservations/types"

type VisitFacts = {
  date: string
  time: string
  partySize: number
  zone: ReservationZone
}

function Tile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-olive-line bg-cream px-2.5 py-3 sm:px-3">
      <Icon aria-hidden className="size-5 text-olive-muted" />
      <div className="min-w-0">
        <dt className="font-label text-[0.625rem] tracking-[0.12em] text-olive-muted uppercase">{label}</dt>
        <dd className="font-heading text-base leading-tight font-bold text-olive sm:text-lg">{value}</dd>
      </div>
    </div>
  )
}

/** Fecha destacada arriba y hora, personas y zona en tres tiles. */
function ReservationVisitFacts({ visit }: { visit: VisitFacts }) {
  return (
    <dl className="grid grid-cols-3 gap-2">
      <div className="col-span-3 flex min-w-0 items-center gap-3 rounded-2xl border border-olive-line bg-cream px-4 py-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-olive text-cream">
          <CalendarDays aria-hidden className="size-5" />
        </span>
        <div className="min-w-0">
          <dt className="font-label text-[0.625rem] tracking-[0.14em] text-olive-muted uppercase">Fecha</dt>
          <dd className="font-heading text-base leading-tight font-bold text-olive sm:text-lg">{formatVisitDate(visit.date)}</dd>
        </div>
      </div>
      <Tile icon={Clock} label="Hora" value={visit.time} />
      <Tile icon={Users} label="Personas" value={String(visit.partySize)} />
      <Tile icon={MapPin} label="Zona" value={zoneConfig(visit.zone).label} />
    </dl>
  )
}

export { ReservationVisitFacts }
export type { VisitFacts }
