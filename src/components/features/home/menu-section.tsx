import { ComingSoonButton } from "@/components/features/coming-soon-button"
import { Reveal } from "@/components/features/home/reveal"
import { Container, Section, Stack } from "@/components/ui/layout"
import { Eyebrow, Heading, Text } from "@/components/ui/typography"

function MenuSection() {
  return (
    <Section id="carta" spacing="lg" divider className="scroll-mt-24">
      <Container width="narrow">
        <Stack gap="xl">
          <Reveal className="flex flex-col gap-5">
            <Eyebrow className="text-terracotta">La carta</Eyebrow>
            <Heading as="h2" size="h2">
              Favoritos de siempre.
            </Heading>
            <Text className="max-w-prose">
              Aquí va a estar la carta de PIÙ. Todavía no está publicada, así que esta sección no muestra
              platos ni precios.
            </Text>
          </Reveal>

          <Reveal className="grid gap-8 border-y border-olive-line py-8 sm:grid-cols-2">
            <div>
              <p className="font-label text-xs font-semibold tracking-[0.16em] text-olive-muted uppercase">01</p>
              <p className="mt-3 font-heading text-3xl font-extrabold tracking-[-0.03em]">Pizza</p>
            </div>
            <div>
              <p className="font-label text-xs font-semibold tracking-[0.16em] text-olive-muted uppercase">02</p>
              <p className="mt-3 font-heading text-3xl font-extrabold tracking-[-0.03em]">Dolce</p>
            </div>
          </Reveal>

          <Reveal>
            <ComingSoonButton
              title="Carta"
              message="La carta en línea estará disponible próximamente."
              variant="primary"
              size="lg"
              className="w-full sm:w-auto"
            >
              Ver nuestra carta
            </ComingSoonButton>
          </Reveal>
        </Stack>
      </Container>
    </Section>
  )
}

export { MenuSection }
