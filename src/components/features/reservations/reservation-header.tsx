import Image from "next/image"

import reserva from "@/assets/reservations/reserva.webp"
import { Eyebrow, Heading } from "@/components/ui/typography"
import { getPublicOpeningHours } from "@/server/reservations/public-hours"

async function ReservationHeader() {
  const hours = await getPublicOpeningHours()

  return (
    <header className="lg:sticky lg:top-24">
      <Eyebrow className="text-terracotta">Reservas en PIÙ</Eyebrow>
      <Heading as="h1" size="h3" className="mt-2">
        Tu reserva te espera.
      </Heading>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-olive-strong">
        Confirmamos cada solicitud. El pedido es por cantidad de personas.
      </p>
      <section className="mt-5 max-w-sm" aria-labelledby="reservation-hours-title">
        <h2 id="reservation-hours-title" className="font-label text-xs font-semibold tracking-[0.14em] text-terracotta uppercase">
          Horario
        </h2>
        <dl className="mt-3 flex flex-col gap-3 text-base">
          {hours.map((row) => (
            <div key={row.days}>
              <div className="flex justify-between gap-4">
                <dt className="text-olive-strong">{row.days}</dt>
                <dd className="font-semibold text-olive tabular-nums">{row.hours}</dd>
              </div>
              {row.lastSeatingTime ? <p className="mt-0.5 text-sm text-olive-muted">Última reserva en línea: {row.lastSeatingTime}</p> : null}
            </div>
          ))}
        </dl>
      </section>
      <Image
        src={reserva}
        alt="Dos osos de PIÙ compartiendo una pizza en la mesa."
        sizes="(min-width: 1024px) 22rem, 0px"
        className="mt-8 hidden aspect-[1216/801] w-full object-contain lg:block"
      />
    </header>
  )
}

export { ReservationHeader }
