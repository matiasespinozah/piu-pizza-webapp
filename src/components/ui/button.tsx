import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"
import { ArrowRightIcon, Loader2Icon } from "lucide-react"

/**
 * Botón PIÙ (DESIGN.md §4 · Botones).
 *
 * - primary   → oliva sólido. Acción principal ("Ver menú", "Pedir ahora").
 * - secondary → outline. Acción secundaria ("Conoce PIÙ", "Cómo llegar").
 * - tertiary  → texto con flecha. Acción terciaria dentro de contenido.
 * - ghost     → sin borde; para íconos y controles dentro de otros componentes.
 * - link      → se ve como un enlace en línea.
 * - accent    → terracota. Acción principal sobre fotografía (hero, reservas).
 * - onPhoto   → borde crema, fondo transparente. Acción secundaria sobre fotografía.
 *
 * `default` y `outline` son alias de `primary` y `secondary` para mantener
 * compatibilidad con los componentes de shadcn/ui.
 *
 * Mobile first: en móvil todos los tamaños miden al menos 44 px. `sm` e `icon-sm`
 * se compactan a 40 px solo desde `md:` (puntero fino).
 */
const buttonVariants = cva(
  [
    "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent",
    "font-sans font-semibold whitespace-nowrap select-none transition-[background-color,border-color,box-shadow,color,transform] duration-150",
    "outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring",
    "disabled:pointer-events-none disabled:opacity-45 aria-busy:cursor-progress",
    "active:not-aria-[haspopup]:translate-y-px",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-tactile hover:shadow-lift hover:bg-[color-mix(in_srgb,var(--brand-olive),white_8%)]",
        secondary:
          "border-olive-soft bg-transparent text-foreground hover:bg-olive-hover aria-expanded:bg-olive-hover",
        tertiary:
          "h-auto! px-0! text-foreground underline-offset-6 decoration-1 hover:underline hover:decoration-2",
        ghost:
          "bg-transparent text-foreground hover:bg-olive-hover aria-expanded:bg-olive-hover",
        link: "h-auto! px-0! text-foreground underline underline-offset-4 decoration-olive-soft hover:decoration-foreground",
        accent:
          "bg-terracotta text-cream shadow-tactile hover:bg-[color-mix(in_srgb,var(--brand-terracotta),white_14%)] focus-visible:outline-cream",
        onPhoto:
          "border-[color-mix(in_srgb,var(--brand-cream),transparent_25%)] bg-transparent text-cream hover:border-cream hover:bg-[color-mix(in_srgb,var(--brand-cream),transparent_88%)] focus-visible:outline-cream",
        // Alias de compatibilidad con shadcn/ui
        default:
          "bg-primary text-primary-foreground shadow-tactile hover:shadow-lift hover:bg-[color-mix(in_srgb,var(--brand-olive),white_8%)]",
        outline:
          "border-olive-soft bg-transparent text-foreground hover:bg-olive-hover aria-expanded:bg-olive-hover",
      },
      size: {
        sm: "h-11 px-4 text-sm md:h-10",
        md: "h-11 px-5 text-[0.9375rem]",
        lg: "h-12 px-6 text-base",
        icon: "size-11 rounded-4xl",
        "icon-sm": "size-11 rounded-4xl md:size-10",
        // Alias de compatibilidad con shadcn/ui
        default: "h-11 px-5 text-[0.9375rem]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Renderiza el hijo (p. ej. un `<Link>`) con los estilos del botón. */
    asChild?: boolean
    /** Muestra un spinner, deshabilita el botón y marca `aria-busy`. */
    loading?: boolean
  }

function Button({
  className,
  variant = "primary",
  size = "md",
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button"
  const isTertiary = variant === "tertiary"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Loader2Icon className="animate-spin" aria-hidden />}
          {children}
          {isTertiary && (
            <ArrowRightIcon
              className="transition-transform duration-150 group-hover/button:translate-x-0.5"
              aria-hidden
            />
          )}
        </>
      )}
    </Comp>
  )
}

export { Button, buttonVariants, type ButtonProps }
