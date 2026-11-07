"use client"

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
      className="rounded-3xl border border-olive-line bg-surface-raised px-4 py-6 shadow-lift"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <h2 className="font-heading text-xl font-bold text-olive">Necesitas tu enlace privado</h2>
      <p className="mt-3 text-base text-olive-strong">
        El enlace llega al enviar la solicitud. Pégalo completo. El código PIU-… no alcanza para consultar.
      </p>
      <label className="mt-5 block text-sm font-semibold text-olive" htmlFor="tracking-credential">
        Enlace o código secreto
      </label>
      <Input
        id="tracking-credential"
        name="credential"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        maxLength={500}
        className="mt-2"
        aria-describedby="tracking-help"
      />
      <p id="tracking-help" className="mt-2 text-sm text-olive-muted">
        Si no lo guardaste, el restaurante puede generarte otro. Desde aquí no se recupera con el celular ni con la referencia.
      </p>
      {error ? <p className="mt-3 text-sm text-olive-strong">{error}</p> : null}
      <Button type="submit" variant="accent" className="mt-5 h-12 w-full" aria-busy={pending} disabled={pending}>
        {pending ? "Consultando…" : "Consultar reserva"}
      </Button>
      <div className="mt-3 grid grid-cols-1 gap-3">
        <Button asChild variant="secondary" className="h-12 w-full">
          <a href="/reservas">Volver a reservas</a>
        </Button>
        <Button asChild variant="secondary" className="h-12 w-full">
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
            Escribir por WhatsApp
          </a>
        </Button>
      </div>
    </form>
  )
}

export { ReservationStatusLookup }
