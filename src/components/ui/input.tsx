import * as React from "react"
import { cn } from "cn"

/**
 * Campo de texto PIÙ (DESIGN.md §4 · Inputs & Forms): 44 px de alto, borde
 * `olive-soft`, foco visible de 2 px. En estado inválido el borde se engrosa,
 * pero el error siempre debe ir también como texto (ver `FieldError`).
 */
const inputBase = [
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-3.5 text-base text-foreground transition-[border-color,background-color]",
  "placeholder:text-muted-foreground",
  "hover:border-[color-mix(in_srgb,var(--brand-olive)_55%,transparent)]",
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:border-foreground",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-olive-wash disabled:opacity-60",
  "aria-invalid:border-2 aria-invalid:border-foreground",
].join(" ")

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        inputBase,
        "h-11 py-2 file:mr-3 file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Input, inputBase }
