import { MinusIcon, PlusIcon, SofaIcon, SunIcon } from "lucide-react"
import { cn } from "cn"

import { FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { maxPartyFor, reservationConfig, zoneConfig } from "@/lib/reservations/configuration"
import type { ReservationDraft, ReservationErrors, ReservationZone } from "@/lib/reservations/types"

const zoneIcons = {
  salon: SofaIcon,
  terrace: SunIcon,
} as const

type ReservationDateStepProps = {
  draft: ReservationDraft
  errors: ReservationErrors
  today: string
  onChange: (patch: Partial<ReservationDraft>) => void
}

function ReservationDateStep({ draft, errors, today, onChange }: ReservationDateStepProps) {
  const min = reservationConfig.partySize.min
  const max = maxPartyFor(draft.zone)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <FieldLabel htmlFor="reservation-date">Fecha</FieldLabel>
        <Input
          id="reservation-date"
          type="date"
          value={draft.date}
          min={today || undefined}
          autoComplete="off"
          className="mt-2 bg-cream"
          aria-invalid={errors.date ? true : undefined}
          aria-describedby={errors.date ? "reservation-date-error" : undefined}
          onChange={(event) => onChange({ date: event.target.value, preferredTime: "" })}
        />
        <FieldError id="reservation-date-error">{errors.date}</FieldError>
      </div>

      <div>
        <FieldLabel id="reservation-party-label">Personas</FieldLabel>
        <div className="mt-2 flex h-14 items-center justify-between rounded-full bg-cream px-2">
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-full text-olive outline-none hover:bg-olive-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-45"
            aria-label="Menos personas"
            disabled={draft.partySize <= min}
            onClick={() => onChange({ partySize: draft.partySize - 1 })}
          >
            <MinusIcon aria-hidden />
          </button>
          <span
            aria-live="polite"
            aria-labelledby="reservation-party-label"
            className="font-heading text-2xl font-bold text-olive tabular-nums"
          >
            {draft.partySize}
          </span>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-full text-olive outline-none hover:bg-olive-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-45"
            aria-label="Más personas"
            disabled={draft.partySize >= max}
            onClick={() => onChange({ partySize: draft.partySize + 1 })}
          >
            <PlusIcon aria-hidden />
          </button>
        </div>
        {draft.zone ? (
          <p className="mt-2 text-sm text-olive-strong">
            Hasta {max} personas en {draft.zone === "salon" ? "el salón" : "la terraza"}.
          </p>
        ) : null}
        <FieldError>{errors.partySize}</FieldError>
      </div>

      <fieldset>
        <legend className="mb-2 font-medium text-olive">Zona</legend>
        <div className="grid grid-cols-2 gap-3">
          {reservationConfig.zones.map((zone) => {
            const Icon = zoneIcons[zone.id]
            const selected = draft.zone === zone.id
            return (
              <button
                key={zone.id}
                type="button"
                aria-pressed={selected}
                className={cn(
                  "flex min-h-[5.5rem] flex-col items-start justify-center gap-1 rounded-2xl px-3 py-3 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  selected ? "bg-olive text-cream" : "bg-cream text-olive"
                )}
                onClick={() => {
                  const nextZone = zone.id as ReservationZone
                  const cap = zoneConfig(nextZone).maxPartySize
                  onChange({
                    zone: nextZone,
                    ...(draft.partySize > cap ? { partySize: cap } : {}),
                  })
                }}
              >
                <Icon aria-hidden className="size-5" />
                <span className="font-heading text-lg leading-none font-bold">{zone.label}</span>
                <span className={cn("text-sm", selected ? "text-cream/80" : "text-olive-strong")}>
                  {zone.description} Hasta {zone.maxPartySize}.
                </span>
              </button>
            )
          })}
        </div>
        <FieldError>{errors.zone}</FieldError>
      </fieldset>
    </div>
  )
}

export { ReservationDateStep }
