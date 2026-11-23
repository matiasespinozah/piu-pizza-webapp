import { quotaTone, type QuotaCell, type QuotaRow } from "@/lib/reservations/web-quota"
import { cn } from "cn"

const toneClass = {
  free: "bg-status-good-soft text-status-good",
  partial: "bg-status-waiting-soft text-status-waiting",
  high: "bg-status-waiting-soft text-status-waiting",
  none: "bg-status-closed-soft text-status-closed",
} as const

function freeSeats(cell: QuotaCell) {
  return Math.max(0, cell.web - cell.used)
}

function seatLine(time: string, label: string, cell: QuotaCell, people: number) {
  const who = people === 1 ? "llega 1 persona" : `llegan ${people} personas`
  if (cell.web <= 0) return `${time} — ${label}: sin cupos · ${who}`
  return `${time} — ${label}: ${freeSeats(cell)} de ${cell.web} cupos disponibles · ${who}`
}

function QuotaLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-olive-strong">
      <li className="inline-flex min-h-11 items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-status-good-solid" /> Cupos disponibles
      </li>
      <li className="inline-flex min-h-11 items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-status-waiting-solid" /> Menos de 5 cupos
      </li>
      <li className="inline-flex min-h-11 items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-status-closed" /> Sin cupos
      </li>
    </ul>
  )
}

function QuotaGrid({ rows, zone }: { rows: QuotaRow[]; zone: "all" | "salon" | "terrace" }) {
  const zones = (["salon", "terrace"] as const).filter((item) => zone === "all" || zone === item)
  return (
    <div className={cn("grid gap-5", zones.length > 1 && "lg:grid-cols-2")}>
      {zones.map((key) => {
        const label = key === "salon" ? "Salón" : "Terraza"
        return (
          <section key={key} aria-labelledby={`cupos-${key}`}>
            <h2 id={`cupos-${key}`} className="mb-2 font-heading text-lg font-extrabold text-olive">
              {label}
            </h2>
            <ul className="flex flex-col gap-2">
              {rows.map((row) => {
                const cell = row[key]
                return (
                  <li key={row.time} className={cn("flex min-h-11 items-center rounded-2xl px-3 py-2 text-sm font-semibold", toneClass[quotaTone(cell)])}>
                    {seatLine(row.time, label, cell, row.people[key])}
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
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
              className={cn("w-full rounded-t-md", tone === "none" ? "bg-status-closed" : tone === "partial" || tone === "high" ? "bg-status-waiting-solid" : "bg-status-good-solid")}
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
