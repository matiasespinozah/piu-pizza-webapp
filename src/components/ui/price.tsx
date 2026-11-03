import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/**
 * Precio en pesos chilenos (CLP), en Roboto Mono con cifras tabulares.
 * `amount` es un entero en pesos (CLP no usa decimales).
 * Solo mostrar precios respaldados por datos reales (DESIGN.md §4).
 */
const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
})

function formatCLP(amount: number) {
  return clp.format(amount)
}

const priceVariants = cva("font-label font-semibold tabular-nums tracking-[0.02em] text-foreground", {
  variants: {
    size: {
      sm: "text-sm",
      md: "text-base",
      lg: "text-xl font-bold",
    },
  },
  defaultVariants: { size: "md" },
})

type PriceProps = Omit<React.ComponentProps<"span">, "children"> &
  VariantProps<typeof priceVariants> & {
    amount: number
    /** Precio anterior (tachado). Solo si existe una rebaja real. */
    compareAt?: number
  }

function Price({ amount, compareAt, size, className, ...props }: PriceProps) {
  return (
    <span data-slot="price" className={cn("inline-flex items-baseline gap-2", className)} {...props}>
      {compareAt !== undefined && compareAt > amount && (
        <s className={cn(priceVariants({ size: "sm" }), "font-medium text-muted-foreground")}>
          <span className="sr-only">Antes </span>
          {formatCLP(compareAt)}
        </s>
      )}
      <span className={priceVariants({ size })}>
        {compareAt !== undefined && compareAt > amount && <span className="sr-only">Ahora </span>}
        {formatCLP(amount)}
      </span>
    </span>
  )
}

export { Price, formatCLP, priceVariants }
