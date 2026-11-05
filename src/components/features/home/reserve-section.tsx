import { CalendarIcon } from "lucide-react"

import { ComingSoonButton } from "@/components/features/coming-soon-button"
import { Reveal } from "@/components/features/home/reveal"
import { Container, Section } from "@/components/ui/layout"
import { Eyebrow, Heading, Text } from "@/components/ui/typography"

function ReserveSection() {
  return (
    <Section id="reservas" spacing="lg" surface="olive" className="scroll-mt-24">
      <Container width="narrow">
        <Reveal className="flex flex-col items-start gap-6">
          <Eyebrow className="text-terracotta-soft">Reservas</Eyebrow>
          <Heading as="h2" size="display-alt" className="text-cream">
            Tu mesa te espera.
          </Heading>
          <Text className="max-w-md text-cream">Elige cuándo venir y nosotros nos encargamos del resto.</Text>
          <ComingSoonButton
            title="Reservas"
            message="La reserva en línea estará disponible próximamente."
            variant="accent"
            size="lg"
            className="w-full sm:w-auto"
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
