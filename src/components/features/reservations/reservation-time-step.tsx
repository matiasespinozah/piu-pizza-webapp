import { cn } from "cn"

import { FieldError } from "@/components/ui/field"
import { formatVisitDate, openingWindow, preferenceSlots, type ReservationClock, type VisitHours } from "@/lib/reservations/schedule"
import type { ReservationDraft, ReservationErrors } from "@/lib/reservations/types"

type ReservationTimeStepProps = {
  draft: ReservationDraft
  errors: ReservationErrors
  clock: ReservationClock
  visit?: VisitHours | null
  onChange: (preferredTime: string) => void
}

function ReservationTimeStep({ draft, errors, clock, visit = null, onChange }: ReservationTimeStepProps) {
  const closed = Boolean(draft.date) && openingWindow(draft.date, clock, visit) === null
  const slots = draft.date ? preferenceSlots(draft.date, new Date(), clock, visit) : []

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="sr-only">Horario de preferencia</legend>
      {draft.date ? <p className="font-heading text-lg font-bold text-olive">{formatVisitDate(draft.date)}</p> : null}

      {closed ? <p className="text-base text-olive">Ese día no hay horario de reservas. Elige otra fecha en Tu visita.</p> : null}
      {!closed && slots.length === 0 ? (
        <p className="text-base text-olive">Hoy ya no quedan horarios. Prueba con otro día.</p>
      ) : null}

      {slots.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 min-[380px]:grid-cols-4">
          {slots.map((slot) => {
            const selected = draft.preferredTime === slot
            return (
              <button
                key={slot}
                type="button"
                aria-pressed={selected}
                className={cn(
                  "h-12 rounded-full font-label text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  selected ? "bg-terracotta text-cream" : "bg-cream text-olive"
                )}
                onClick={() => onChange(slot)}
              >
                {slot}
              </button>
            )
          })}
        </div>
      ) : null}
      <FieldError>{errors.preferredTime}</FieldError>
    </fieldset>
  )
}

export { ReservationTimeStep }
