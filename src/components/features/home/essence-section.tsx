import type { StaticImageData } from "next/image"
import Image from "next/image"
import { cn } from "cn"

import terraza from "@/assets/home/terraza.webp"
import { Reveal } from "@/components/features/home/reveal"
import { Container, Section } from "@/components/ui/layout"
import { Eyebrow, Heading, Text } from "@/components/ui/typography"

/**
 * Cuando exista la foto del salón, importarla y asignarla a `salonImage`.
 * Ejemplo: `import salon from "@/assets/home/salon.webp"`
 */
const salonImage: StaticImageData | undefined = undefined

function PhotoLabel({ children }: { children: string }) {
  return (
    <span className="absolute bottom-3 left-3 rounded-full bg-cream/90 px-3 py-1.5 font-label text-[0.6875rem] font-semibold tracking-[0.16em] text-olive uppercase">
      {children}
    </span>
  )
}

function SpacePhoto({
  image,
  alt,
  label,
  className,
}: {
  image: StaticImageData
  alt: string
  label: string
  className?: string
}) {
  return (
    <div className={cn("relative aspect-[4/3] overflow-hidden rounded-2xl lg:aspect-auto lg:h-full lg:min-h-[24rem]", className)}>
      <Image
        src={image}
        alt={alt}
        fill
        placeholder="blur"
        sizes="(max-width: 1024px) 100vw, 640px"
        className="object-cover object-center"
      />
      <PhotoLabel>{label}</PhotoLabel>
    </div>
  )
}

function SalonPanel() {
  if (salonImage) {
    return (
      <SpacePhoto
        image={salonImage}
        alt="Interior de PIÙ: cocina abierta, mesón y salón."
        label="Salón"
      />
    )
  }

  return (
    <div className="relative flex flex-col justify-end overflow-hidden rounded-2xl bg-olive px-5 py-6 text-cream sm:px-7 sm:py-7 lg:h-full lg:min-h-[24rem] lg:p-8">
      <Eyebrow className="text-terracotta-soft">Interior</Eyebrow>
      <p className="mt-3 font-heading text-[clamp(1.9rem,5vw,2.75rem)] leading-[0.95] font-extrabold tracking-[-0.03em]">
        Salón
      </p>
      <Text className="mt-3 max-w-xs text-cream">Cocina abierta y mesón. Un espacio para sentarse, pedir y quedarse.</Text>
    </div>
  )
}

function EssenceSection() {
  return (
    <Section id="esencia" spacing="sm" className="scroll-mt-24 bg-cream">
      <Container>
        <Reveal className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <div className="max-w-[34rem]">
            <Eyebrow className="text-terracotta">El lugar</Eyebrow>
            <Heading as="h2" size="h2" className="mt-4">
              Un lugar para compartir.
            </Heading>
          </div>
          <Text className="max-w-sm lg:pb-1">
            Cocina abierta, mesón y terraza. Un espacio para sentarse, pedir y quedarse.
          </Text>
        </Reveal>

        <div className="mt-8 grid gap-4 lg:mt-10 lg:grid-cols-12 lg:gap-6">
          <Reveal className="lg:col-span-7">
            <SpacePhoto
              image={terraza}
              alt="Terraza de PIÙ con mesas de madera, sillas y luces cálidas."
              label="Terraza"
            />
          </Reveal>

          <Reveal className="lg:col-span-5">
            <SalonPanel />
          </Reveal>
        </div>
      </Container>
    </Section>
  )
}

export { EssenceSection }
