"use client"

import { cn } from "cn"

type CategoryNavItem = {
  id: string
  name: string
  hasProducts: boolean
}

type CategoryNavigationProps = {
  items: readonly CategoryNavItem[]
  activeId: string | null
  onSelect: (id: string) => void
}

/** Chips deslizables. Las secciones en preparación van después, más tenues. */
function CategoryNavigation({ items, activeId, onSelect }: CategoryNavigationProps) {
  const ready = items.filter((item) => item.hasProducts)
  const pending = items.filter((item) => !item.hasProducts)

  function handleSelect(event: React.MouseEvent<HTMLButtonElement>, id: string) {
    onSelect(id)
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    event.currentTarget.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: reduce ? "auto" : "smooth",
    })
  }

  function renderChip(item: CategoryNavItem) {
    const active = item.id === activeId
    return (
      <li key={item.id} className="shrink-0 snap-start lg:snap-align-none">
        <button
          type="button"
          aria-pressed={active}
          onClick={(event) => handleSelect(event, item.id)}
          className={cn(
            "inline-flex min-h-11 items-center rounded-4xl border px-4 text-[0.9375rem] font-semibold whitespace-nowrap outline-none transition-[background-color,border-color,color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive",
            active
              ? "border-olive bg-olive text-cream"
              : item.hasProducts
                ? "border-olive-soft text-olive hover:bg-olive-hover"
                : "border-olive-line text-olive-muted hover:bg-olive-hover hover:text-olive"
          )}
        >
          {item.name}
        </button>
      </li>
    )
  }

  return (
    <nav aria-label="Categorías de la carta">
      <ul className="-mx-4 flex snap-x snap-proximity items-center gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
        {ready.map(renderChip)}
        {ready.length > 0 && pending.length > 0 ? (
          <li aria-hidden className="mx-1 h-6 w-px shrink-0 bg-olive-line" />
        ) : null}
        {pending.map(renderChip)}
        <li aria-hidden className="w-2 shrink-0 lg:hidden" />
      </ul>
    </nav>
  )
}

export { CategoryNavigation }
export type { CategoryNavItem }
