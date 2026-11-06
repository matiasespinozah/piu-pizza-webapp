"use client"

import * as React from "react"

import { CategoryNavigation, type CategoryNavItem } from "@/components/features/menu/category-navigation"
import { EmptyCategory } from "@/components/features/menu/empty-category"
import { MenuSearch } from "@/components/features/menu/menu-search"
import { ProductList } from "@/components/features/menu/product-list"
import { Container } from "@/components/ui/layout"
import { searchProducts } from "@/lib/catalog/search"
import type { Category, Product } from "@/lib/catalog/types"

type MenuExplorerProps = {
  categories: readonly Category[]
  products: readonly Product[]
}

/** Estado local de la carta: categoría activa y búsqueda. Sin red. */
function MenuExplorer({ categories, products }: MenuExplorerProps) {
  const navItems = React.useMemo<CategoryNavItem[]>(
    () =>
      categories.map((category) => ({
        id: category.id,
        name: category.name,
        hasProducts: products.some((product) => product.categoryId === category.id),
      })),
    [categories, products]
  )

  const defaultCategory = navItems.find((item) => item.hasProducts) ?? navItems[0]
  const [activeId, setActiveId] = React.useState(defaultCategory?.id ?? null)
  const [query, setQuery] = React.useState("")

  const searching = query.trim().length > 0
  const activeItem = navItems.find((item) => item.id === activeId)
  const activeProducts = products.filter((product) => product.categoryId === activeId)
  const results = React.useMemo(() => (searching ? searchProducts(products, query) : []), [products, query, searching])

  // Enlaces desde la Home: /carta#pastas abre esa categoría.
  React.useEffect(() => {
    function applyHash() {
      const slug = window.location.hash.slice(1)
      const match = slug ? categories.find((category) => category.slug === slug) : undefined
      if (match) setActiveId(match.id)
    }
    const timer = window.setTimeout(applyHash, 0)
    window.addEventListener("hashchange", applyHash)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener("hashchange", applyHash)
    }
  }, [categories])

  function selectCategory(id: string) {
    setQuery("")
    setActiveId(id)
  }

  return (
    <>
      <Container className="pb-3">
        <MenuSearch value={query} onChange={setQuery} />
      </Container>

      <div className="sticky top-[calc(env(safe-area-inset-top)+4rem)] z-30 border-b border-olive-line bg-cream lg:static lg:border-b-0">
        <Container>
          <CategoryNavigation items={navItems} activeId={searching ? null : activeId} onSelect={selectCategory} />
        </Container>
      </div>

      <Container className="min-h-[26rem] pt-8 pb-28 sm:pt-10 lg:pb-24">
        {searching ? (
          <section key="search" aria-labelledby="menu-panel-title">
            <div className="mb-5 flex items-baseline justify-between gap-4">
              <h2 id="menu-panel-title" className="font-heading text-[1.5rem] font-extrabold tracking-[-0.02em] text-olive">
                Resultados
              </h2>
              <p role="status" className="font-label text-xs font-semibold tracking-[0.12em] text-olive-muted uppercase">
                {results.length === 1 ? "1 preparación" : `${results.length} preparaciones`}
              </p>
            </div>

            {results.length > 0 ? (
              <ProductList products={results} />
            ) : (
              <div className="hero-rise max-w-[30rem] py-8">
                <p className="font-heading text-[clamp(1.5rem,5vw,2rem)] leading-[1.15] font-extrabold tracking-[-0.02em] text-olive">
                  No encontramos «{query.trim()}» en nuestra carta.
                </p>
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="mt-4 inline-flex min-h-11 items-center text-[0.9375rem] font-semibold text-olive underline decoration-olive-soft underline-offset-4 outline-none hover:decoration-olive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
                >
                  Limpiar búsqueda
                </button>
              </div>
            )}
          </section>
        ) : activeItem ? (
          <section key={activeItem.id} aria-labelledby="menu-panel-title">
            <h2 id="menu-panel-title" className="mb-5 font-heading text-[1.5rem] font-extrabold tracking-[-0.02em] text-olive">
              {activeItem.name}
            </h2>

            {activeProducts.length > 0 ? (
              <ProductList products={activeProducts} />
            ) : (
              <EmptyCategory
                categoryName={activeItem.name}
                backLabel={defaultCategory ? `Volver a ${defaultCategory.name}` : "Volver"}
                onBack={() => defaultCategory && selectCategory(defaultCategory.id)}
              />
            )}
          </section>
        ) : null}
      </Container>
    </>
  )
}

export { MenuExplorer }
