import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "cn"
import type { PastWindow } from "@/lib/reservations/staff-views"

const scopes = [
  { view: "today", label: "Hoy" },
  { view: "future", label: "Futuras" },
  { view: "past", label: "Pasadas" },
] as const

type Scope = (typeof scopes)[number]["view"]

function ReservationScope({ active, past }: { active: Scope | null; past: PastWindow }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Cuándo">
        {scopes.map((item) => {
          const on = active === item.view
          const href = item.view === "past" ? `/admin/reservas?view=past&month=${past.month}` : `/admin/reservas?view=${item.view}`
          return (
            <Link
              key={item.view}
              href={href}
              role="tab"
              aria-selected={on}
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-xl text-sm font-semibold",
                on ? "bg-primary text-primary-foreground" : "border border-olive-line text-olive",
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
      {active === "past" ? (
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/admin/reservas?view=past&month=${past.previousMonth}`}
            aria-label="Mes anterior"
            className="inline-flex size-11 items-center justify-center rounded-xl border border-olive-line text-olive"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </Link>
          <p className="min-w-0 truncate text-center text-sm font-semibold text-olive">{past.label}</p>
          {past.nextMonth ? (
            <Link
              href={`/admin/reservas?view=past&month=${past.nextMonth}`}
              aria-label="Mes siguiente"
              className="inline-flex size-11 items-center justify-center rounded-xl border border-olive-line text-olive"
            >
              <ChevronRight aria-hidden className="size-5" />
            </Link>
          ) : (
            <span aria-hidden className="inline-flex size-11 items-center justify-center rounded-xl border border-olive-line text-olive-soft">
              <ChevronRight className="size-5" />
            </span>
          )}
        </div>
      ) : null}
    </div>
  )
}

export { ReservationScope }
