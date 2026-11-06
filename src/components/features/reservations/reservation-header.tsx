import Image from "next/image"

import reserva from "@/assets/reservations/reserva.webp"
import { Eyebrow, Heading } from "@/components/ui/typography"

function ReservationHeader() {
  return (
    <header className="lg:sticky lg:top-24">
      <Eyebrow className="text-terracotta">Reservas en PIÙ</Eyebrow>
      <Heading as="h1" size="h3" className="mt-2">
        Tu mesa te espera.
      </Heading>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-olive-strong">
        Confirmamos cada solicitud antes de reservar la mesa.
      </p>
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
