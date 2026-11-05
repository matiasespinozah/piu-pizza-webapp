"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowUpRightIcon, ChevronDownIcon } from "lucide-react"
import { cn } from "cn"

import { Reveal } from "@/components/features/home/reveal"
import { ProductImage } from "@/components/features/menu/product-image"
import { Button } from "@/components/ui/button"

type ShowcaseCategory = {
  id: string
  slug: string
  name: string
  hasProducts: boolean
  imageUrl?: string | null
}

const INITIAL_VISIBLE = 3

/** Tarjetas de categoría de la Home: 3 visibles y el resto detrás de «Mostrar más». */
function CategoryShowcase({ categories }: { categories: readonly ShowcaseCategory[] }) {
  const [expanded, setExpanded] = React.useState(false)
  const topRef = React.useRef<HTMLDivElement>(null)
  const scrollBack = React.useRef(false)
  const hidden = categories.length - INITIAL_VISIBLE
  const visible = expanded ? categories : categories.slice(0, INITIAL_VISIBLE)

  // Al colapsar, la página se acorta mucho: vuelve al inicio de las categorías.
  React.useEffect(() => {
    if (expanded || !scrollBack.current) return
    scrollBack.current = false
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    topRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })
  }, [expanded])

  function toggle() {
    if (expanded) scrollBack.current = true
    setExpanded((value) => !value)
  }

  return (
    <div ref={topRef} className="scroll-mt-24">
      <ul className="grid gap-3 sm:grid-cols-3 sm:gap-4 lg:gap-5">
        {visible.map((category, index) => {
          const extra = index >= INITIAL_VISIBLE
          return (
            <li
              key={category.id}
              className={cn(extra && "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500")}
              style={extra ? { animationDelay: `${Math.min(index - INITIAL_VISIBLE, 5) * 50}ms`, animationFillMode: "backwards" } : undefined}
            >
              <Reveal className="h-full">
                <Link
                  href={`/carta#${category.slug}`}
                  className="group flex h-full overflow-hidden rounded-2xl border border-olive-line bg-cream outline-none transition-[transform,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive sm:flex-col motion-safe:lg:hover:-translate-y-1 lg:hover:shadow-lift"
                >
                  <div className="relative w-[36%] shrink-0 sm:w-full">
                    <ProductImage
                      src={category.imageUrl}
                      name={category.name}
                      ratio="1/1"
                      sizes="(max-width: 640px) 140px, 380px"
                      className="size-full rounded-none bg-olive-wash sm:aspect-[4/3] sm:h-auto"
                    />
                    <span className="absolute top-2 left-2 rounded-full bg-cream/90 px-2 py-0.5 font-label text-[0.6875rem] font-semibold tracking-[0.12em] text-olive-muted">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-4 sm:justify-start sm:p-5">
                    <h3 className="font-heading text-xl leading-[1.15] font-extrabold tracking-[-0.015em] text-olive">
                      {category.name}
                    </h3>
                    <p className="flex items-center justify-between gap-2 font-label text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
                      <span className={category.hasProducts ? "text-terracotta" : "text-olive-muted"}>
                        {category.hasProducts ? "Ver sabores" : "Próximamente"}
                      </span>
                      <ArrowUpRightIcon
                        aria-hidden
                        className="size-4 text-olive-muted transition-transform duration-300 motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5"
                      />
                    </p>
                  </div>
                </Link>
              </Reveal>
            </li>
          )
        })}
      </ul>

      {hidden > 0 ? (
        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            variant="accent"
            size="lg"
            aria-expanded={expanded}
            onClick={toggle}
            className="w-full hover:shadow-lift sm:w-auto sm:min-w-[19rem]"
          >
            {expanded ? (
              "Mostrar menos"
            ) : (
              <>
                Mostrar más categorías
                <span className="rounded-full bg-cream/25 px-2 py-0.5 text-xs font-bold tabular-nums">{hidden}</span>
              </>
            )}
            <ChevronDownIcon
              aria-hidden
              className={cn("size-4 transition-transform duration-300", expanded && "rotate-180")}
            />
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export { CategoryShowcase }
export type { ShowcaseCategory }
