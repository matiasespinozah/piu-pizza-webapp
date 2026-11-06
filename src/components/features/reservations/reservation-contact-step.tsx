import { FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { reservationConfig } from "@/lib/reservations/configuration"
import type { ReservationDraft, ReservationErrors } from "@/lib/reservations/types"

type ReservationContactStepProps = {
  draft: ReservationDraft
  errors: ReservationErrors
  onChange: (patch: Partial<ReservationDraft>) => void
}

function ReservationContactStep({ draft, errors, onChange }: ReservationContactStepProps) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <FieldLabel htmlFor="reservation-name">Nombre</FieldLabel>
        <Input
          id="reservation-name"
          name="name"
          autoComplete="name"
          value={draft.customerName}
          maxLength={80}
          className="mt-2 bg-cream"
          aria-invalid={errors.customerName ? true : undefined}
          aria-describedby={errors.customerName ? "reservation-name-error" : undefined}
          onChange={(event) => onChange({ customerName: event.target.value })}
        />
        <FieldError id="reservation-name-error">{errors.customerName}</FieldError>
      </div>

      <div>
        <FieldLabel htmlFor="reservation-phone">Celular</FieldLabel>
        <Input
          id="reservation-phone"
          name="tel"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="9 2887 3619"
          value={draft.customerPhone}
          className="mt-2 bg-cream"
          aria-invalid={errors.customerPhone ? true : undefined}
          aria-describedby={errors.customerPhone ? "reservation-phone-error" : undefined}
          onChange={(event) => onChange({ customerPhone: event.target.value })}
        />
        <FieldError id="reservation-phone-error">{errors.customerPhone}</FieldError>
      </div>

      <div>
        <FieldLabel htmlFor="reservation-notes">
          Observaciones <span className="font-normal text-muted-foreground">(opcional)</span>
        </FieldLabel>
        <Textarea
          id="reservation-notes"
          name="notes"
          value={draft.notes}
          maxLength={reservationConfig.notesMaxLength}
          placeholder="Cumpleaños, silla de niños…"
          className="mt-2 min-h-20 bg-cream"
          aria-invalid={errors.notes ? true : undefined}
          onChange={(event) => onChange({ notes: event.target.value })}
        />
        <FieldError>{errors.notes}</FieldError>
      </div>
    </div>
  )
}

export { ReservationContactStep }
