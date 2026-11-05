import { Reveal } from "@/components/features/home/reveal"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Container, Section } from "@/components/ui/layout"
import { formatCLP } from "@/components/ui/price"
import { Eyebrow, Heading, Text } from "@/components/ui/typography"
import { getChefSuggestions, type MenuProduct } from "@/lib/menu"

function SuggestionCard({ suggestion, index }: { suggestion: MenuProduct; index: number }) {
  const order = String(index + 1).padStart(2, "0")

  return (
    <Card variant="raised" size="feature" className="h-full shadow-tactile">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <Badge variant="outline">{order} · Chef</Badge>
          <span
            aria-hidden
            className="font-heading text-[2.75rem] leading-none font-black tracking-[-0.06em] text-olive-line lg:text-[3.25rem]"
          >
            {suggestion.name.slice(0, 1)}
          </span>
        </div>
        <CardTitle className="mt-2 text-[1.65rem] lg:text-[1.85rem]">{suggestion.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="max-w-[22rem] text-olive-strong">{suggestion.description}</CardDescription>
      </CardContent>
      <CardFooter className="border-t border-olive-line pt-4">
        <p className="font-label text-xl font-bold tabular-nums tracking-[0.02em] text-terracotta">
          {formatCLP(suggestion.price)}
        </p>
      </CardFooter>
    </Card>
  )
}

function ChefSuggestions() {
  const suggestions = getChefSuggestions()

  return (
    <Section
      id="sugerencias"
      aria-labelledby="sugerencias-heading"
      spacing="none"
      className="scroll-mt-24 bg-cream pt-10 pb-16 sm:pt-16 sm:pb-24 lg:py-36"
    >
      <Container>
        <Reveal className="flex max-w-[38rem] flex-col gap-5">
          <Eyebrow className="text-terracotta">Selección PIÙ</Eyebrow>
          <Heading id="sugerencias-heading" as="h2" size="h2">
            Sugerencias del chef
          </Heading>
          <Text>Tres pizzas para partir por lo mejor de la casa.</Text>
        </Reveal>
      </Container>

      <Reveal>
        <ul className="home-rail mx-auto mt-10 flex max-w-[1200px] snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-4 sm:scroll-px-6 sm:px-6 md:mt-12 lg:mt-14 lg:grid lg:grid-cols-3 lg:gap-8 lg:overflow-visible lg:px-8 lg:pb-0">
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              className="w-[min(19.5rem,78vw)] shrink-0 snap-start lg:w-auto lg:min-w-0"
            >
              <SuggestionCard suggestion={suggestion} index={index} />
            </li>
          ))}
        </ul>
      </Reveal>
    </Section>
  )
}

export { ChefSuggestions }
