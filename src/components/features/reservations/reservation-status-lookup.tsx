"use client"

import { Link2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { reservationStatusWhatsappMessage } from "@/lib/reservations/configuration"

const whatsappHref = `https://wa.me/56928873619?text=${encodeURIComponent(reservationStatusWhatsappMessage)}`

function ReservationStatusLookup({
  value,
  error,
  pending,
  onChange,
  onSubmit,
}: {
  value: string
  error: string
  pending: boolean
  onChange: (value: string) => void
  onSubmit: () => void
}) {
  return (
    <form
      className="reservation-status-in flex flex-col gap-4 rounded-3xl border border-olive-line bg-surface-raised px-5 py-6 shadow-lift sm:px-7"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-xl font-bold text-olive">Pega tu enlace de seguimiento</h2>
        <p className="text-sm text-olive-muted">Lo recibiste al enviar tu solicitud.</p>
      </div>
      <div className="relative">
        <Link2 aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-olive-muted" />
        <Input
          id="tracking-credential"
          name="credential"
          aria-label="Enlace de seguimiento"
          placeholder="https://…/reservas/estado#…"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={500}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "tracking-error" : undefined}
          className="h-12 pl-10"
        />
      </div>
      {error ? (
        <p id="tracking-error" role="alert" className="text-sm text-olive-strong">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="accent" size="lg" className="w-full" loading={pending}>
        Consultar
      </Button>
      <p className="text-center text-sm text-olive-muted">
        ¿No lo tienes?{" "}
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-olive underline underline-offset-4">
          Escríbenos por WhatsApp
        </a>
      </p>
    </form>
  )
}

export { ReservationStatusLookup }
