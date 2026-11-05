import { Reveal } from "@/components/features/home/reveal"
import { ProductImage } from "@/components/features/menu/product-image"
import { Container, Section } from "@/components/ui/layout"
import { formatCLP } from "@/components/ui/price"
import { Eyebrow, Heading, Text } from "@/components/ui/typography"
import { catalogDataSource } from "@/lib/catalog/catalog-data-source"
import { CHEF_CATEGORY_ID } from "@/lib/catalog/data"
import type { Product } from "@/lib/catalog/types"

function SuggestionCard({ suggestion, index }: { suggestion: Product; index: number }) {
  const order = String(index + 1).padStart(2, "0")

  return (
    <article className="group/card flex h-full flex-col overflow-hidden rounded-2xl border border-olive-line bg-surface-raised shadow-tactile transition-shadow duration-300 hover:shadow-lift">
      <div className="relative p-3 pb-0">
        <ProductImage
          src={suggestion.imageUrl}
          name={suggestion.name}
          ratio="1/1"
          sizes="(max-width: 1024px) 78vw, 380px"
          className="bg-cream"
        />
        <span className="absolute top-6 left-6 inline-flex h-7 items-center rounded-4xl bg-olive px-3 font-label text-[0.6875rem] font-semibold tracking-[0.14em] text-cream uppercase">
          {order} · Chef
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-5 pt-5 pb-5 sm:px-6 sm:pb-6">
        <h3 className="font-heading text-[1.65rem] leading-[1.1] font-extrabold tracking-[-0.02em] text-olive lg:text-[1.85rem]">
          {suggestion.name}
        </h3>
        <p className="text-[0.9375rem] leading-[1.5] text-olive-strong">{suggestion.description}</p>

        <div className="mt-auto flex items-end justify-between gap-4 border-t border-olive-line pt-4">
          <p className="font-label text-[0.6875rem] font-semibold tracking-[0.16em] text-olive-muted uppercase">
            Pizza artesanal
          </p>
          <p className="font-label text-xl font-bold tabular-nums tracking-[0.02em] text-terracotta">
            {formatCLP(suggestion.priceClp)}
          </p>
        </div>
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
