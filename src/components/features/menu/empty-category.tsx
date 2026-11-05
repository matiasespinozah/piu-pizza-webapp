"use client"

import { Button } from "@/components/ui/button"
import { Eyebrow } from "@/components/ui/typography"

type EmptyCategoryProps = {
  categoryName: string
  onBack: () => void
  backLabel: string
}

/** Estado honesto para secciones sin productos publicados. */
function EmptyCategory({ categoryName, onBack, backLabel }: EmptyCategoryProps) {
  return (
    <div className="hero-rise max-w-[30rem] py-10 sm:py-14">
      <Eyebrow className="text-terracotta">{categoryName} · En preparación</Eyebrow>
      <p className="mt-5 font-heading text-[clamp(1.75rem,5vw,2.5rem)] leading-[1.1] font-extrabold tracking-[-0.025em] text-olive">
        Estamos preparando esta sección de nuestra carta.
      </p>
      <p className="mt-4 text-base leading-[1.55] text-olive-strong">
        Pronto podrás descubrir más sabores de PIÙ.
      </p>
      <Button type="button" variant="link" className="mt-6 min-h-11" onClick={onBack}>
        {backLabel}
      </Button>
    </div>
  )
}

export { EmptyCategory }
