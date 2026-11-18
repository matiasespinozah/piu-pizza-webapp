"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"

type ReservationFiltersProps = {
  q?: string
  date?: string
  status?: string
  zone?: string
  view?: string
  active: boolean
}

const fieldClass =
  "admin-control w-full min-w-0 max-w-full outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"

function ReservationFilters({ q, date, status, zone, view, active }: ReservationFiltersProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-w-0">
      <Button
        type="button"
        className="h-11 rounded-xl"
        aria-expanded={open}
        aria-label={active ? "Filtrar, hay filtros activos" : "Filtrar"}
        onClick={() => setOpen((current) => !current)}
      >
        Filtrar
        {active ? <span aria-hidden className="size-2 rounded-full bg-cream" /> : null}
      </Button>
      <div className={cn("grid transition-[grid-template-rows] duration-300 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden" inert={open ? undefined : true}>
          <form
            method="get"
            action="/admin/reservas"
            className={cn(
              "flex min-w-0 flex-col gap-3 pt-3 lg:flex-row lg:flex-wrap lg:items-end",
              open && "motion-safe:animate-in motion-safe:slide-in-from-right-8 motion-safe:fade-in-0 motion-safe:duration-300",
            )}
          >
            <label className="relative flex min-w-0 flex-col gap-1 text-sm font-semibold text-olive lg:w-56">
              Nombre o referencia
              <span className="relative">
                <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-olive-muted" />
                <input name="q" defaultValue={q} placeholder="Nombre o referencia" className={`${fieldClass} pl-9`} />
              </span>
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-sm font-semibold text-olive lg:w-40">
              Fecha
              <input name="date" type="date" defaultValue={date} className={fieldClass} />
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-sm font-semibold text-olive lg:w-44">
              Estado
              <select name="status" defaultValue={status ?? ""} className={fieldClass}>
                <option value="">Todos</option>
                <option value="pending">Pendiente</option>
                <option value="confirmed">Confirmada</option>
                <option value="reschedule_requested">Cambio propuesto</option>
                <option value="rejected">Rechazada</option>
                <option value="cancelled">Cancelada</option>
                <option value="arrived">Llegó</option>
                <option value="completed">Finalizada</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-sm font-semibold text-olive lg:w-36">
              Zona
              <select name="zone" defaultValue={zone ?? ""} className={fieldClass}>
                <option value="">Todas</option>
                <option value="salon">Salón</option>
                <option value="terrace">Terraza</option>
              </select>
            </label>
            {view ? <input type="hidden" name="view" value={view} /> : null}
            <Button type="submit" className="h-11">
              Aplicar
            </Button>
            {active ? (
              <a href="/admin/reservas" className="inline-flex h-11 items-center text-sm font-semibold text-olive underline underline-offset-4">
                Limpiar
              </a>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  )
}

export { ReservationFilters }
