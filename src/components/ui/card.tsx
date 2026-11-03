import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/**
 * Card PIÙ (DESIGN.md §4 · Cards & Containers).
 *
 * - default     → fondo crema, borde fino, radio 12 px, sin sombra.
 * - raised      → superficie `#F0F0E4` para jerarquía leve (tarjetas destacadas).
 * - plain       → sin borde ni fondo; solo estructura.
 * - interactive → añade hover sutil (borde más marcado + elevación). Usar cuando
 *                 toda la tarjeta es clickeable (envolver con <Link> vía `asChild` en el hijo).
 *
 * `size`: compact (8 px, 16 px de padding) · default (12 px, 20–24 px) · feature (16 px, 24–32 px).
 */
const cardVariants = cva(
  "group/card flex flex-col gap-(--card-gap) overflow-hidden text-card-foreground [--card-pad:--spacing(5)] [--card-gap:--spacing(4)] sm:[--card-pad:--spacing(6)]",
  {
    variants: {
      variant: {
        default: "border border-border bg-card",
        raised: "border border-border bg-surface-raised",
        plain: "bg-transparent [--card-pad:0px]! sm:[--card-pad:0px]!",
      },
      size: {
        compact: "rounded-(--radius-compact) [--card-pad:--spacing(4)] sm:[--card-pad:--spacing(4)] [--card-gap:--spacing(3)]",
        default: "rounded-xl",
        feature: "rounded-2xl sm:[--card-pad:--spacing(8)] [--card-gap:--spacing(5)]",
      },
      interactive: {
        true: "transition-[border-color,box-shadow,transform] duration-200 hover:border-olive-soft hover:shadow-hover focus-within:border-olive-soft",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      interactive: false,
    },
  }
)

function Card({
  className,
  variant,
  size,
  interactive,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      data-size={size ?? "default"}
      className={cn(cardVariants({ variant, size, interactive }), className)}
      {...props}
    />
  )
}

/** Imagen protagonista a sangre en la parte superior de la tarjeta. */
function CardMedia({
  className,
  ratio = "4/5",
  ...props
}: React.ComponentProps<"div"> & { ratio?: "1/1" | "4/5" | "3/4" | "16/9" }) {
  const ratios = {
    "1/1": "aspect-square",
    "4/5": "aspect-[4/5]",
    "3/4": "aspect-[3/4]",
    "16/9": "aspect-video",
  } as const
  return (
    <div
      data-slot="card-media"
      className={cn(
        "relative overflow-hidden bg-olive-wash [&_img]:object-cover [&_img]:transition-transform [&_img]:duration-500 group-hover/card:[&_img]:scale-[1.02]",
        ratios[ratio],
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "grid auto-rows-min items-start gap-1.5 px-(--card-pad) pt-(--card-pad) last:pb-(--card-pad) has-data-[slot=card-action]:grid-cols-[1fr_auto] [[data-slot=card-media]+&]:pt-0",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({
  className,
  as: Comp = "h3",
  ...props
}: React.ComponentProps<"h3"> & { as?: "h2" | "h3" | "h4" | "p" }) {
  return (
    <Comp
      data-slot="card-title"
      className={cn(
        "font-heading text-xl leading-tight font-bold tracking-[-0.01em] sm:text-2xl group-data-[size=compact]/card:text-lg",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-[0.9375rem] leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-pad) last:pb-(--card-pad)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "mt-auto flex items-center gap-3 px-(--card-pad) pb-(--card-pad)",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardMedia,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  cardVariants,
}
