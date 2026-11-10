import { quotaTone, type QuotaCell, type QuotaRow } from "@/lib/reservations/web-quota"
import { cn } from "cn"

const toneClass = {
  free: "bg-status-good-soft text-status-good",
  partial: "bg-status-waiting-soft text-status-waiting",
  high: "bg-status-closed-soft text-status-closed",
  none: "bg-olive-hover text-olive-muted",
} as const

function cellLabel(cell: QuotaCell) {
  if (cell.web <= 0) return "Sin cupo web"
  return `${cell.used} / ${cell.web}`
}

function QuotaLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-olive-strong">
      <li className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-status-good-solid" /> Alta disponibilidad
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-status-waiting-solid" /> Ocupación media
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-status-closed" /> Pocos cupos web
      </li>
    </ul>
  )
}

function QuotaGrid({ rows, zone }: { rows: QuotaRow[]; zone: "all" | "salon" | "terrace" }) {
  const showSalon = zone !== "terrace"
  const showTerrace = zone !== "salon"
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[18rem] border-separate border-spacing-y-1.5 text-sm">
        <caption className="sr-only">Cupos web ocupados por horario y sector. No es la ocupación física del local.</caption>
        <thead>
          <tr className="text-left text-xs text-olive-muted">
            <th className="px-1 py-1 font-semibold">Hora</th>
            {showSalon ? <th className="px-1 py-1 font-semibold">Salón</th> : null}
            {showTerrace ? <th className="px-1 py-1 font-semibold">Terraza</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.time}>
              <th className="px-1 py-1 text-left font-heading text-sm font-bold text-olive">{row.time}</th>
              {showSalon ? <QuotaCellView cell={row.salon} label="Salón" /> : null}
              {showTerrace ? <QuotaCellView cell={row.terrace} label="Terraza" /> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function QuotaCellView({ cell, label }: { cell: QuotaCell; label: string }) {
  return (
    <td className="px-1 py-0.5">
      <span className={cn("flex min-h-11 flex-col justify-center rounded-xl px-3 py-1.5", toneClass[quotaTone(cell)])}>
        <span className="font-heading text-sm leading-tight font-bold">{cellLabel(cell)}</span>
        <span className="text-[0.6875rem]">cupos web · {label}</span>
      </span>
    </td>
  )
}

function QuotaChart({ rows }: { rows: QuotaRow[] }) {
  return (
    <div className="flex h-36 items-end gap-1" role="img" aria-label="Cupos web usados durante el día, por franja">
      {rows.map((row) => {
        const web = row.salon.web + row.terrace.web
        const used = row.salon.used + row.terrace.used
        const ratio = web > 0 ? Math.min(1, used / web) : 0
        const tone = quotaTone({ used, web })
        return (
          <div key={row.time} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1">
            <div
              className={cn("w-full rounded-t-md", tone === "high" ? "bg-status-closed" : tone === "partial" ? "bg-status-waiting-solid" : "bg-status-good-solid")}
              style={{ height: `${Math.max(8, Math.round(ratio * 100))}%` }}
              title={`${row.time}: ${used} de ${web} cupos web`}
            />
            <span className="truncate text-center text-[0.625rem] text-olive-muted">{row.time.slice(0, 2)}</span>
          </div>
        )
      })}
    </div>
  )
}

export { QuotaChart, QuotaGrid, QuotaLegend }
