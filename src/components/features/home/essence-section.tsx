import { PlaceSwitcher } from "@/components/features/home/place-switcher"
import { Reveal } from "@/components/features/home/reveal"
import { Container, Section } from "@/components/ui/layout"
import { Eyebrow, Heading } from "@/components/ui/typography"

function EssenceSection() {
  return (
    <Section id="esencia" spacing="sm" className="scroll-mt-24 bg-cream">
      <Container>
        <Reveal>
          <Eyebrow className="text-terracotta">El lugar</Eyebrow>
          <Heading as="h2" size="h2" className="mt-4 max-w-[34rem]">
            Un lugar para compartir.
          </Heading>
        </Reveal>
        <PlaceSwitcher />
      </Container>
    </Section>
  )
}

export { EssenceSection }
