import * as React from "react"
import NextLink from "next/link"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { ArrowUpRightIcon } from "lucide-react"

/**
 * Enlace PIÙ (DESIGN.md §4 · Links). Envuelve `next/link`.
 *
 * - inline   → dentro de párrafos; subrayado visible siempre.
 * - nav      → navegación principal; subrayado al hover / página activa.
 * - standalone → enlace suelto ("Ver todas las pizzas"); subrayado al hover.
 *
 * Con `external` abre en otra pestaña con `rel="noopener noreferrer"` y añade
 * un ícono + texto para lectores de pantalla.
 */
const textLinkVariants = cva(
  "inline-flex items-center gap-1 rounded-xs text-foreground transition-[text-decoration-color,text-decoration-thickness,opacity] outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring",
  {
    variants: {
      variant: {
        inline:
          "inline font-medium underline decoration-olive-soft decoration-1 underline-offset-4 hover:decoration-foreground hover:decoration-2",
        nav: "min-h-11 text-[0.9375rem] font-semibold decoration-2 underline-offset-8 hover:underline aria-[current=page]:underline sm:text-base",
        standalone:
          "font-semibold decoration-1 underline-offset-6 hover:underline hover:decoration-2",
      },
    },
    defaultVariants: { variant: "inline" },
  }
)

type TextLinkProps = React.ComponentProps<typeof NextLink> &
  VariantProps<typeof textLinkVariants> & {
    /** Enlace a otro sitio: nueva pestaña, rel seguro e ícono. */
    external?: boolean
  }

function TextLink({ className, variant, external = false, children, ...props }: TextLinkProps) {
  const externalProps = external ? { target: "_blank", rel: "noopener noreferrer" } : {}
  return (
    <NextLink
      data-slot="text-link"
      className={cn(textLinkVariants({ variant }), className)}
      {...externalProps}
      {...props}
    >
      {children}
      {external && (
        <>
          <ArrowUpRightIcon className="size-[0.9em] shrink-0" aria-hidden />
          <span className="sr-only"> (se abre en una pestaña nueva)</span>
        </>
      )}
    </NextLink>
  )
}

export { TextLink, textLinkVariants }
