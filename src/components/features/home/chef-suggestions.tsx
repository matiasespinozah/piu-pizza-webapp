import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { Reveal } from "@/components/features/home/reveal"
import { ProductImage } from "@/components/features/menu/product-image"
import { Button } from "@/components/ui/button"
import { Container, Section } from "@/components/ui/layout"
import { formatCLP } from "@/components/ui/price"
import { Eyebrow, Heading, Text } from "@/components/ui/typography"
import { catalogDataSource } from "@/lib/catalog/catalog-data-source"
import { CHEF_CATEGORY_ID } from "@/lib/catalog/data"
import type { Product } from "@/lib/catalog/types"

function SuggestionCard({ suggestion, index }: { suggestion: Product; index: number }) {
  const order = String(index + 1).padStart(2, "0")

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-olive-line bg-surface-raised">
      <div className="relative">
        <ProductImage
          src={suggestion.imageUrl}
          name={suggestion.name}
          ratio="4/3"
          sizes="(max-width: 1024px) 78vw, 380px"
          className="w-full rounded-none bg-olive-wash"
        />
        <span className="absolute top-3 left-3 rounded-full bg-cream/90 px-2.5 py-1 font-label text-[0.6875rem] font-semibold tracking-[0.14em] text-olive">
          {order}
        </span>
      </div>

      <div className="flex flex-1 flex-col px-5 pt-4 pb-5">
        <h3 className="font-heading text-[1.45rem] leading-[1.1] font-extrabold tracking-[-0.02em] text-olive">
          {suggestion.name}
        </h3>
        <p className="mt-2 flex-1 text-[0.9375rem] leading-[1.5] text-olive-strong">{suggestion.description}</p>
        <p className="mt-4 font-label text-xl font-bold tracking-[0.02em] text-terracotta tabular-nums">
          {formatCLP(suggestion.priceClp)}
        </p>
      </div>
    </article>
  )
}

async function ChefSuggestions() {
  const suggestions = await catalogDataSource.getProductsByCategory(CHEF_CATEGORY_ID)

  return (
    <Section
      id="sugerencias"
      aria-labelledby="sugerencias-heading"
      spacing="none"
      className="scroll-mt-24 bg-cream pt-10 pb-14 sm:pt-14 sm:pb-20 lg:py-24"
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

      <Container>
        <Reveal className="mt-10 lg:mt-12">
          <Button asChild variant="accent" size="lg" className="w-full hover:shadow-lift sm:w-auto">
            <Link href="/carta">
              Ver carta
              <ArrowRightIcon aria-hidden />
            </Link>
          </Button>
        </Reveal>
      </Container>
    </Section>
  )
}

export { ChefSuggestions }
