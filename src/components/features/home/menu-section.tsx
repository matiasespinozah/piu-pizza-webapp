import Link from "next/link"

import { CategoryShowcase, type ShowcaseCategory } from "@/components/features/home/category-showcase"
import { Reveal } from "@/components/features/home/reveal"
import { Button } from "@/components/ui/button"
import { Container, Section } from "@/components/ui/layout"
import { Eyebrow, Heading, Text } from "@/components/ui/typography"
import { catalogDataSource } from "@/lib/catalog/catalog-data-source"

async function MenuSection() {
  const [categories, products] = await Promise.all([
    catalogDataSource.getCategories(),
    catalogDataSource.getProducts(),
  ])

  // Categorías con productos primero; la imagen sale del primer producto de cada una.
  const showcase: ShowcaseCategory[] = categories
    .map((category) => {
      const items = products.filter((product) => product.categoryId === category.id)
      return {
        id: category.id,
        slug: category.slug,
        name: category.name,
        hasProducts: items.length > 0,
        imageUrl: items.find((item) => item.imageUrl)?.imageUrl,
      }
    })
    .toSorted((a, b) => Number(b.hasProducts) - Number(a.hasProducts))

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

      <div className="mx-auto mt-10 max-w-[1200px] px-4 sm:px-6 lg:mt-14 lg:px-8">
        <CategoryShowcase categories={showcase} />
      </div>

      <Container>
        <Reveal className="mt-10 lg:mt-14">
          <Button asChild variant="primary" size="lg" className="w-full sm:w-auto">
            <Link href="/carta">Explorar carta completa</Link>
          </Button>
        </Reveal>
      </Container>
    </Section>
  )
}

export { MenuSection }
