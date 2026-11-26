import { Reveal } from "@/components/features/home/reveal"
import { VisitLocationCard } from "@/components/features/home/visit-location-card"
import { Container, Section } from "@/components/ui/layout"
import { Eyebrow, Heading } from "@/components/ui/typography"
import type { HoursLine } from "@/lib/reservations/schedule"
import { visitVenues } from "@/lib/site"

function VisitSection({ hours }: { hours: HoursLine[] }) {
  return (
    <Section id="ubicacion" spacing="sm" className="scroll-mt-24 bg-cream">
      <Container>
        <Reveal>
          <div className="max-w-[36rem]">
            <Eyebrow className="text-terracotta">Visítanos</Eyebrow>
            <Heading as="h2" size="h2" className="mt-4">
              Ven a encontrarnos.
            </Heading>
          </div>
        </Reveal>

        <div className="mt-8 grid gap-6 lg:mt-10 lg:grid-cols-2 lg:gap-7">
          {visitVenues.map((location) => (
            <Reveal key={location.id}>
              <VisitLocationCard location={location} hours={hours} />
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  )
}

export { VisitSection }