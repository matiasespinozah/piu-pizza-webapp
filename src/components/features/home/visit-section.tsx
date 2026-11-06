import { ArrowUpRightIcon, MapPinIcon } from "lucide-react"

import { MapEmbed } from "@/components/features/home/map-embed"
import { Reveal } from "@/components/features/home/reveal"
import { Button } from "@/components/ui/button"
import { Container, Section } from "@/components/ui/layout"
import { Eyebrow, Heading, Text } from "@/components/ui/typography"
import { directionsUrl, mapsEmbedUrl, mapsSearchUrl, venue } from "@/lib/site"

function VisitSection() {
  return (
    <Section id="ubicacion" spacing="sm" className="scroll-mt-24 bg-cream">
      <Container>
        <Reveal className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <div className="max-w-[34rem]">
            <Eyebrow className="text-terracotta">Visítanos</Eyebrow>
            <Heading as="h2" size="h2" className="mt-4">
              Ven a encontrarnos.
            </Heading>
            <Text className="mt-3 max-w-md">Tu próximo buen momento empieza aquí.</Text>
          </div>

          <div className="flex flex-col items-start gap-5 lg:max-w-[20rem] lg:pb-1">
            <div>
              <p className="font-heading text-lg font-bold tracking-[-0.01em] text-olive">{venue.name}</p>
              <address className="mt-2 not-italic">
                <a
                  href={mapsSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-sm outline-none hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-olive"
                >
                  <Text>
                    {venue.street}
                    <br />
                    {venue.locality}
                  </Text>
                </a>
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

        <Reveal className="mt-8 lg:mt-10">
          <div className="relative">
            <MapEmbed src={mapsEmbedUrl} title={`Mapa de ${venue.name} en ${venue.street}, ${venue.locality}`} />
            <a
              href={mapsSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute right-3 bottom-3 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-cream px-4 text-sm font-semibold text-olive shadow-lift outline-none transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-olive"
            >
              Abrir en Google Maps
              <ArrowUpRightIcon className="size-4" aria-hidden />
            </a>
          </div>
        </Reveal>
      </Container>
    </Section>
  )
}

export { VisitSection }
