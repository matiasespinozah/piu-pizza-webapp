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

function Fact({ icon: Icon, label, value, wide = false }: { icon: LucideIcon; label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2 flex min-w-0 items-center gap-3" : "flex min-w-0 items-center gap-3"}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-olive-hover text-olive">
        <Icon aria-hidden className="size-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-olive-muted">{label}</dt>
        <dd className="truncate text-[0.9375rem] font-semibold text-olive">{value}</dd>
      </div>
    </div>
  )
}

function ReservationVisitFacts({ visit }: { visit: VisitFacts }) {
  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-4 rounded-2xl border border-olive-line bg-cream p-4">
      <Fact icon={CalendarDays} label="Fecha" value={formatVisitDate(visit.date)} wide />
      <Fact icon={Clock} label="Hora" value={visit.time} />
      <Fact icon={Users} label="Personas" value={String(visit.partySize)} />
      <Fact icon={MapPin} label="Zona" value={zoneConfig(visit.zone).label} wide />
    </dl>
  )
}

export { ReservationVisitFacts }
export type { VisitFacts }
