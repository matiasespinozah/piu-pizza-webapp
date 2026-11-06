import { cn } from "cn"

import type { ReservationStep } from "@/lib/reservations/types"

const steps = [
  { id: 1 as const, label: "Tu visita" },
  { id: 2 as const, label: "Horario" },
  { id: 3 as const, label: "Tus datos" },
]

type ReservationProgressProps = {
  step: ReservationStep
  onSelect: (step: ReservationStep) => void
}

function ReservationProgress({ step, onSelect }: ReservationProgressProps) {
  return (
    <ol aria-label="Progreso de la solicitud" className="grid grid-cols-3 gap-2">
      {steps.map((item) => {
        const current = item.id === step
        const done = item.id < step
        return (
          <li key={item.id}>
            <button
              type="button"
              aria-current={current ? "step" : undefined}
              disabled={item.id > step}
              className={cn(
                "flex h-11 w-full items-center justify-center rounded-full px-2 text-[0.8rem] font-semibold outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                current && "bg-olive text-cream",
                done && "bg-olive-wash text-olive",
                item.id > step && "bg-transparent text-muted-foreground"
              )}
              onClick={() => {
                if (done) onSelect(item.id)
              }}
            >
              {item.label}
            </button>
          </li>
        )
      })}
    </ol>
  )
}

export { ReservationProgress }
