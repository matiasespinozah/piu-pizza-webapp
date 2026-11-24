import { cn } from "cn"
import { Clock } from "lucide-react"
import Image from "next/image"

import reserva from "@/assets/reservations/reserva.webp"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Eyebrow, Heading } from "@/components/ui/typography"
import { getPublicOpeningHours, type HoursLine } from "@/server/reservations/public-hours"

function HoursList({ hours, className }: { hours: HoursLine[]; className?: string }) {
  return (
    <dl className={cn("flex flex-col gap-2 text-sm", className)}>
      {hours.map((row) => (
        <div key={row.days} className="flex items-baseline justify-between gap-4">
          <dt className="text-olive-strong">{row.days}</dt>
          <dd className="text-right">
            <span className="font-semibold text-olive tabular-nums">{row.hours}</span>
            {row.lastSeatingTime ? (
              <span className="block text-xs text-olive-muted">En línea hasta {row.lastSeatingTime}</span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  )
}

async function ReservationHeader() {
  const hours = await getPublicOpeningHours()

  return (
    <header className="lg:sticky lg:top-24">
      <Eyebrow className="text-terracotta">Reservas en PIÙ</Eyebrow>
      <Heading as="h1" size="h3" className="mt-1">
        Tu reserva te espera.
      </Heading>
      <Accordion type="single" collapsible className="mt-3 rounded-2xl border border-olive-line bg-surface-raised px-4 lg:hidden">
        <AccordionItem value="hours">
          <AccordionTrigger className="min-h-11 items-center py-2 text-sm font-semibold text-olive hover:no-underline">
            <span className="flex items-center gap-2">
              <Clock className="size-4 text-terracotta" aria-hidden="true" />
              Ver horario
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-3">
            <HoursList hours={hours} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <section className="mt-6 hidden max-w-sm lg:block" aria-labelledby="reservation-hours-title">
        <h2 id="reservation-hours-title" className="font-label text-xs font-semibold tracking-[0.14em] text-terracotta uppercase">
          Horario
        </h2>
        <HoursList hours={hours} className="mt-3" />
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
