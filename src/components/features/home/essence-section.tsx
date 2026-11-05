import Image from "next/image"

import terraza from "@/assets/home/terraza.webp"
import { Reveal } from "@/components/features/home/reveal"
import { Container, Section } from "@/components/ui/layout"
import { Eyebrow, Heading, Text } from "@/components/ui/typography"

function EssenceSection() {
  return (
    <Section id="esencia" spacing="lg" className="scroll-mt-24 bg-cream">
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-7">
            <div className="relative aspect-[3/2] overflow-hidden rounded-xl">
              <Image
                src={terraza}
                alt="Terraza de PIÙ con mesas de madera, sillas y luces cálidas."
                fill
                placeholder="blur"
                sizes="(max-width: 1024px) 100vw, 640px"
                className="object-cover object-center"
              />
            </div>
          </Reveal>

          <Reveal className="flex flex-col gap-5 lg:col-span-5 lg:py-8">
            <Eyebrow className="text-terracotta">El lugar</Eyebrow>
            <Heading as="h2" size="h2">
              Un lugar para
              <br />
              compartir.
            </Heading>
            <Text className="max-w-md">
              Cocina abierta, mesón y terraza. Un espacio para sentarse, pedir y quedarse.
            </Text>
          </Reveal>
        </div>
      </Container>
    </Section>
  )
}

export { EssenceSection }
