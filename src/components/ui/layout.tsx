import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/**
 * Primitivas de layout (DESIGN.md §5).
 *
 * Container → ancho máximo 1200 px, márgenes laterales 16 px (móvil) → 32 px (desktop).
 * Section   → ritmo vertical entre secciones: 56–72 px móvil, 80–144 px desktop.
 * Stack     → apilado vertical con la escala de espaciado (8 px de base).
 */

const containerVariants = cva("mx-auto w-full px-4 sm:px-6 lg:px-8", {
  variants: {
    width: {
      default: "max-w-[1200px]",
      narrow: "max-w-[760px]",
      wide: "max-w-[1440px]",
    },
  },
  defaultVariants: { width: "default" },
})

function Container({
  className,
  width,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof containerVariants>) {
  return <div data-slot="container" className={cn(containerVariants({ width }), className)} {...props} />
}

const sectionVariants = cva("w-full", {
  variants: {
    spacing: {
      default: "py-16 sm:py-20 lg:py-28",
      lg: "py-18 sm:py-24 lg:py-36",
      sm: "py-12 sm:py-14 lg:py-20",
      none: "",
    },
    surface: {
      default: "",
      raised: "bg-surface-raised",
      olive: "bg-primary text-primary-foreground [&_[data-slot=heading]]:text-primary-foreground",
    },
    divider: {
      true: "border-t border-border",
      false: "",
    },
  },
  defaultVariants: { spacing: "default", surface: "default", divider: false },
})

function Section({
  className,
  spacing,
  surface,
  divider,
  ...props
}: React.ComponentProps<"section"> & VariantProps<typeof sectionVariants>) {
  return (
    <section
      data-slot="section"
      className={cn(sectionVariants({ spacing, surface, divider }), className)}
      {...props}
    />
  )
}

const stackVariants = cva("flex flex-col", {
  variants: {
    gap: {
      xs: "gap-2",
      sm: "gap-3",
      md: "gap-4",
      lg: "gap-6",
      xl: "gap-10",
      "2xl": "gap-14",
    },
  },
  defaultVariants: { gap: "md" },
})

function Stack({
  className,
  gap,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof stackVariants>) {
  return <div data-slot="stack" className={cn(stackVariants({ gap }), className)} {...props} />
}

export { Container, Section, Stack, containerVariants, sectionVariants, stackVariants }
