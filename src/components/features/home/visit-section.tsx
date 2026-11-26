import { ArrowUpRightIcon, MapPinIcon } from "lucide-react"

import { MapEmbed } from "@/components/features/home/map-embed"
import { Reveal } from "@/components/features/home/reveal"
import { Button } from "@/components/ui/button"
import { Container, Section } from "@/components/ui/layout"
import { Eyebrow, Heading, Text } from "@/components/ui/typography"
import { visitVenues } from "@/lib/site"

type VisitVenue = (typeof visitVenues)[number]

function VisitLocation({ location }: { location: VisitVenue }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-start gap-5">
        <div>
          <p className="font-heading text-lg font-bold tracking-[-0.01em] text-olive">{location.name}</p>
          <address className="mt-2 not-italic">
            <a
              href={location.mapsSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm outline-none hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-olive"
            >
              <Text>
                {location.street}
                <br />
                {location.locality}
              </Text>
            </a>
          </address>
        </div>

        <Button variant="primary" size="lg" className="w-full sm:w-auto" asChild>
          <a href={location.directionsUrl} target="_blank" rel="noopener noreferrer">
            <MapPinIcon aria-hidden />
            Cómo llegar
          </a>
        </Button>
      </div>

      <div className="relative">
        <MapEmbed
          src={location.mapsEmbedUrl}
          title={`Mapa de ${location.name} en ${location.street}, ${location.locality}`}
          className="h-[14rem] sm:h-[18rem] lg:h-[22rem]"
        />
        <a
          href={location.mapsSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute right-3 bottom-3 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-cream px-4 text-sm font-semibold text-olive shadow-lift outline-none transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-olive"
        >
          Abrir en Google Maps
          <ArrowUpRightIcon className="size-4" aria-hidden />
        </a>
      </div>
    </div>
  )
}

function VisitSection() {
  return (
    <Section id="ubicacion" spacing="sm" className="scroll-mt-24 bg-cream">
      <Container>
        <Reveal>
          <div className="max-w-[34rem]">
            <Eyebrow className="text-terracotta">Visítanos</Eyebrow>
            <Heading as="h2" size="h2" className="mt-4">
              Ven a encontrarnos.
            </Heading>
            <Text className="mt-3 max-w-md">Tu próximo buen momento empieza aquí.</Text>
          </div>
        </Reveal>

        <div className="mt-8 grid gap-12 lg:mt-10 lg:grid-cols-2 lg:gap-8 lg:gap-x-10">
          {visitVenues.map((location) => (
            <Reveal key={location.id}>
              <VisitLocation location={location} />
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  )
}

export { VisitSection }