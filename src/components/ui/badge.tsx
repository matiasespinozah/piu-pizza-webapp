import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

/**
 * Badge / Chip PIÙ: etiqueta en forma de pill (DESIGN.md §4 · Píldora).
 * Úsalo para categorías y atributos reales del producto ("Vegetariana", "Picante").
 * No lo uses para inventar promociones o claims.
 */
const badgeVariants = cva(
  [
    "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border",
    "font-label font-semibold tracking-[0.1em] uppercase whitespace-nowrap transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "[&>svg]:pointer-events-none [&>svg]:size-3!",
  ].join(" "),
  {
    variants: {
      variant: {
        solid: "border-transparent bg-primary text-primary-foreground",
        outline: "border-olive-soft bg-transparent text-foreground [a&]:hover:bg-olive-hover",
        soft: "border-transparent bg-olive-hover text-foreground",
        // Alias de compatibilidad con shadcn/ui
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-olive-hover text-foreground",
      },
      size: {
        sm: "h-6 px-2.5 text-[0.6875rem]",
        md: "h-7 px-3 text-xs",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "sm",
    },
  }
)

function Badge({
  className,
  variant = "outline",
  size = "sm",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
