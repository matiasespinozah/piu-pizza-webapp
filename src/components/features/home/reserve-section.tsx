import { CalendarIcon } from "lucide-react"

import { ComingSoonButton } from "@/components/features/coming-soon-button"
import { Reveal } from "@/components/features/home/reveal"
import { Container, Section } from "@/components/ui/layout"
import { Eyebrow, Heading, Text } from "@/components/ui/typography"

function ReserveSection() {
  return (
    <Section id="reservas" spacing="sm" surface="olive" className="scroll-mt-24">
      <Container>
        <Reveal className="flex flex-col items-start gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
          <div className="max-w-[34rem]">
            <Eyebrow className="text-terracotta-soft">Reservas</Eyebrow>
            <Heading as="h2" size="h2" className="mt-3 text-cream">
              Tu mesa te espera.
            </Heading>
            <Text className="mt-3 max-w-md text-cream">Elige cuándo venir y nosotros nos encargamos del resto.</Text>
          </div>
          <ComingSoonButton
            title="Reservas"
            message="La reserva en línea estará disponible próximamente."
            variant="accent"
            size="lg"
            className="w-full shrink-0 sm:w-auto"
          >
            <CalendarIcon aria-hidden />
            Reservar una mesa
          </ComingSoonButton>
        </Reveal>
      </Container>
    </Section>
  )
}

export { ReserveSection }
