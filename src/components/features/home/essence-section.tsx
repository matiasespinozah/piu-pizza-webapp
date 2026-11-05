import type { StaticImageData } from "next/image"
import Image from "next/image"

import terraza from "@/assets/home/terraza.webp"
import { Reveal } from "@/components/features/home/reveal"
import { Container, Section } from "@/components/ui/layout"
import { Eyebrow, Heading, Text } from "@/components/ui/typography"

/**
 * Cuando exista la foto del salón, importarla y asignarla a `salonImage`.
 * Ejemplo: `import salon from "@/assets/home/salon.webp"`
 */
const salonImage: StaticImageData | undefined = undefined

function SpacePhoto({
  image,
  alt,
}: {
  image: StaticImageData
  alt: string
}) {
  return (
    <div className="relative aspect-[3/2] overflow-hidden rounded-xl">
      <Image
        src={image}
        alt={alt}
        fill
        placeholder="blur"
        sizes="(max-width: 1024px) 100vw, 640px"
        className="object-cover object-center"
      />
    </div>
  )
}

function SalonPanel() {
  if (salonImage) {
    return (
      <SpacePhoto
        image={salonImage}
        alt="Interior de PIÙ: cocina abierta, mesón y salón."
      />
    )
  }

  return (
    <div className="flex min-h-[16rem] flex-col rounded-xl bg-olive px-6 py-8 text-cream sm:px-8 sm:py-10 lg:min-h-[22rem]">
      <Eyebrow className="text-terracotta-soft">Interior</Eyebrow>
      <p className="mt-8 font-heading text-[clamp(2rem,5vw,3rem)] leading-[0.95] font-extrabold tracking-[-0.03em] lg:mt-auto">
        Salón
      </p>
      <Text className="mt-4 max-w-xs text-cream">Cocina abierta y mesón. Un espacio para sentarse, pedir y quedarse.</Text>
    </div>
  )
}

function EssenceSection() {
  return (
    <Section id="esencia" spacing="lg" className="scroll-mt-24 bg-cream">
      <Container>
        <Reveal className="flex max-w-[36rem] flex-col gap-5">
          <Eyebrow className="text-terracotta">El lugar</Eyebrow>
          <Heading as="h2" size="h2">
            Un lugar para
            <br />
            compartir.
          </Heading>
          <Text>Cocina abierta, mesón y terraza. Un espacio para sentarse, pedir y quedarse.</Text>
        </Reveal>

        <div className="mt-12 flex flex-col gap-10 lg:mt-16 lg:grid lg:grid-cols-12 lg:items-end lg:gap-10">
          <Reveal className="lg:col-span-7">
            <SpacePhoto
              image={terraza}
              alt="Terraza de PIÙ con mesas de madera, sillas y luces cálidas."
            />
            <p className="mt-4 font-label text-xs font-semibold tracking-[0.16em] text-olive-muted uppercase">
              Terraza
            </p>
          </Reveal>

          <Reveal className="lg:col-span-5 lg:pb-2">
            <SalonPanel />
            {salonImage ? (
              <p className="mt-4 font-label text-xs font-semibold tracking-[0.16em] text-olive-muted uppercase">
                Salón
              </p>
            ) : null}
          </Reveal>
        </div>
      </Container>
    </Section>
  )
}

export { EssenceSection }
