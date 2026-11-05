import { MapPinIcon } from "lucide-react"

import { MapEmbed } from "@/components/features/home/map-embed"
import { Reveal } from "@/components/features/home/reveal"
import { Button } from "@/components/ui/button"
import { Container, Section } from "@/components/ui/layout"
import { Eyebrow, Heading, Lead, Text } from "@/components/ui/typography"
import { directionsUrl, mapsEmbedUrl, venue } from "@/lib/site"

function VisitSection() {
  return (
    <Section id="ubicacion" spacing="lg" className="scroll-mt-24 bg-cream">
      <Container>
        <Reveal className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <div className="max-w-[34rem]">
            <Eyebrow className="text-terracotta">Visítanos</Eyebrow>
            <Heading as="h2" size="h2" className="mt-5">
              Ven a encontrarnos.
            </Heading>
            <Lead className="mt-5 max-w-md">Tu próximo buen momento empieza aquí.</Lead>
          </div>

          <div className="flex flex-col items-start gap-6 lg:max-w-[20rem] lg:pb-1">
            <div>
              <p className="font-heading text-lg font-bold tracking-[-0.01em] text-olive">{venue.name}</p>
              <address className="mt-2 not-italic">
                <Text>
                  {venue.street}
                  <br />
                  {venue.locality}
                </Text>
              </address>
            </div>

            <Button variant="primary" size="lg" className="w-full sm:w-auto" asChild>
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                <MapPinIcon aria-hidden />
                Cómo llegar
              </a>
            </Button>
          </div>
        </Reveal>

        <Reveal className="mt-10 lg:mt-14">
          <MapEmbed src={mapsEmbedUrl} title={`Mapa de ${venue.name} en ${venue.street}, ${venue.locality}`} />
        </Reveal>
      </Container>
    </Section>
  )
}

export { VisitSection }
