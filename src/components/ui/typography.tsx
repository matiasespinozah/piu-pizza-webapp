import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/**
 * Tipografía PIÙ (DESIGN.md §3 · Jerarquía).
 *
 * Separa el nivel semántico (`as`) del tamaño visual (`size`): un h2 puede
 * verse como "display" sin romper el orden de encabezados de la página.
 *
 * Reglas:
 * - Peso 900 solo en `display` (momentos de marca, titulares cortos).
 * - Tracking negativo solo en encabezados, nunca en texto de lectura.
 * - `Eyebrow` (Roboto Mono, mayúsculas) solo para etiquetas breves.
 */

const headingVariants = cva("font-heading text-balance text-foreground", {
  variants: {
    size: {
      display:
        "text-[clamp(2.375rem,6vw,5.5rem)] leading-[0.98] font-black tracking-[-0.035em]",
      "display-alt":
        "text-[clamp(2.25rem,5vw,4.5rem)] leading-[1.04] font-extrabold tracking-[-0.03em]",
      h2: "text-[clamp(2rem,4.2vw,3.5rem)] leading-[1.06] font-extrabold tracking-[-0.025em]",
      h3: "text-[clamp(1.5rem,2.6vw,2.25rem)] leading-[1.14] font-bold tracking-[-0.02em]",
      h4: "text-xl leading-tight font-bold tracking-[-0.01em] sm:text-2xl",
    },
  },
  defaultVariants: { size: "h2" },
})

type HeadingProps = React.ComponentProps<"h1"> &
  VariantProps<typeof headingVariants> & {
    /** Nivel semántico. Por defecto se deriva de `size`. */
    as?: "h1" | "h2" | "h3" | "h4" | "p"
  }

function Heading({ as, size = "h2", className, ...props }: HeadingProps) {
  const fallback = size === "display" || size === "display-alt" ? "h1" : (size ?? "h2")
  const Comp = as ?? fallback
  return <Comp data-slot="heading" className={cn(headingVariants({ size }), className)} {...props} />
}

/** Atajo para el titular principal de una portada (h1 + tamaño display). */
function Display({ size = "display", ...props }: Omit<HeadingProps, "size"> & { size?: "display" | "display-alt" }) {
  return <Heading as="h1" size={size} {...props} />
}

const textVariants = cva("text-pretty", {
  variants: {
    size: {
      lead: "text-lg leading-[1.45] font-normal text-olive-strong sm:text-xl",
      body: "text-base leading-[1.55] text-olive-strong",
      sm: "text-[0.9375rem] leading-[1.5] text-olive-strong",
      caption: "text-sm leading-[1.45] font-medium text-muted-foreground",
    },
    tone: {
      default: "",
      muted: "text-muted-foreground",
      strong: "text-foreground",
    },
  },
  defaultVariants: { size: "body", tone: "default" },
})

type TextProps = React.ComponentProps<"p"> &
  VariantProps<typeof textVariants> & { as?: "p" | "span" | "div" | "small" }

function Text({ as: Comp = "p", size, tone, className, ...props }: TextProps) {
  return <Comp data-slot="text" className={cn(textVariants({ size, tone }), className)} {...props} />
}

function Lead(props: Omit<TextProps, "size">) {
  return <Text size="lead" {...props} />
}

function Caption({ as = "small", ...props }: Omit<TextProps, "size">) {
  return <Text as={as} size="caption" {...props} />
}

/** Etiqueta superior en Roboto Mono, mayúsculas y tracking amplio ("PIZZA & DOLCE"). */
function Eyebrow({
  as: Comp = "p",
  className,
  ...props
}: React.ComponentProps<"p"> & { as?: "p" | "span" | "div" }) {
  return (
    <Comp
      data-slot="eyebrow"
      className={cn(
        "font-label text-xs leading-[1.4] font-semibold tracking-[0.14em] text-muted-foreground uppercase",
        className
      )}
      {...props}
    />
  )
}

export { Heading, Display, Text, Lead, Caption, Eyebrow, headingVariants, textVariants }
