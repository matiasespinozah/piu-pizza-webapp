import { cn } from "cn"

import { ComingSoonButton } from "@/components/features/coming-soon-button"
import { Reveal } from "@/components/features/home/reveal"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Container, Section } from "@/components/ui/layout"
import { formatCLP } from "@/components/ui/price"
import { Eyebrow, Heading, Text } from "@/components/ui/typography"
import { getCatalogPizzas, menuCategories } from "@/lib/menu"

function MenuSection() {
  const catalogPizzas = getCatalogPizzas()

  return (
    <Section id="carta" spacing="lg" surface="raised" className="scroll-mt-24">
      <Container>
        <Reveal className="flex max-w-[38rem] flex-col gap-5">
          <Eyebrow className="text-terracotta">Nuestra cocina</Eyebrow>
          <Heading as="h2" size="h2">
            Descubre nuestra carta
          </Heading>
          <Text>Pizzas, sabores y preparaciones para cada momento.</Text>
        </Reveal>
      </Container>

      {catalogPizzas.length > 0 ? (
        <Reveal>
          <ul className="home-rail mx-auto mt-10 flex max-w-[1200px] snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-4 sm:scroll-px-6 sm:px-6 lg:grid lg:grid-cols-2 lg:gap-8 lg:overflow-visible lg:px-8 lg:pb-0">
            {catalogPizzas.map((pizza) => (
              <li key={pizza.id} className="w-[min(19.5rem,78vw)] shrink-0 snap-start lg:w-auto lg:min-w-0">
                <Card variant="default" size="feature" className="h-full">
                  <CardHeader>
                    <CardTitle>{pizza.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-olive-strong">{pizza.description}</CardDescription>
                  </CardContent>
                  <CardFooter className="border-t border-olive-line pt-4">
                    <p className="font-label text-xl font-bold tabular-nums tracking-[0.02em] text-terracotta">
                      {formatCLP(pizza.price)}
                    </p>
                  </CardFooter>
                </Card>
              </li>
            ))}
          </ul>
        </Reveal>
      ) : null}

      <div className="mx-auto mt-14 max-w-[1200px] px-4 sm:px-6 lg:mt-20 lg:px-8">
        <Reveal>
          <Eyebrow className="text-terracotta">Categorías</Eyebrow>
        </Reveal>
        <ul className="home-rail mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 lg:grid lg:grid-cols-12 lg:gap-8 lg:overflow-visible lg:pb-0">
          {menuCategories.map((category, index) => (
            <li
              key={category.id}
              className={cn(
                "w-[min(17.5rem,76vw)] shrink-0 snap-start lg:w-auto lg:min-w-0",
                index === 0 ? "lg:col-span-7" : "lg:col-span-5 lg:mt-10"
              )}
            >
              <Reveal>
                <article className="flex h-full flex-col border-t border-olive pt-5">
                  <p className="font-label text-xs font-semibold tracking-[0.16em] text-olive-muted uppercase">
                    {category.kicker}
                  </p>
                  <h3 className="mt-4 font-heading text-[clamp(2.5rem,7vw,4.25rem)] leading-none font-extrabold tracking-[-0.035em]">
                    {category.name}
                  </h3>
                  <p className="mt-4 max-w-sm text-base leading-6 text-olive-strong">{category.description}</p>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>

      <Container>
        <Reveal className="mt-12 lg:mt-16">
          <ComingSoonButton
            title="Carta"
            message="La carta en línea estará disponible próximamente."
            variant="primary"
            size="lg"
            className="w-full sm:w-auto"
          >
            Explorar carta completa
          </ComingSoonButton>
        </Reveal>
      </Container>
    </Section>
  )
}

export { MenuSection }
