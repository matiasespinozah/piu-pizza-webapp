import * as React from "react"
import { cn } from "cn"

/**
 * Logo PIÙ.
 *
 * IMPORTANTE (DESIGN.md §1 y §3): no reconstruir el logo con texto. Cuando
 * exista el archivo oficial, guardarlo en `public/brand/piu-logo.svg`
 * y reemplazar el placeholder por:
 *
 *   import Image from "next/image"
 *   <Image src="/brand/piu-logo.svg" alt="PIÙ — Pizza & Dolce" width={…} height={…} priority />
 *
 * manteniendo la proporción original (`width: auto`).
 *
 * Mientras tanto se muestra un placeholder claramente marcado.
 */
function Logo({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="logo"
      role="img"
      aria-label="PIÙ — Pizza & Dolce"
      title="Placeholder: reemplazar por el logo oficial"
      className={cn(
        "inline-flex h-10 w-fit items-center self-start rounded-sm border border-dashed border-olive-soft px-3 font-label text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase",
        className
      )}
      {...props}
    >
      Logo PIÙ
    </span>
  )
}

export { Logo }
