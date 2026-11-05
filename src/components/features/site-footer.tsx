import Link from "next/link"
import { cn } from "cn"

import { Container } from "@/components/ui/layout"
import { textLinkVariants } from "@/components/ui/text-link"

const links = [
  { href: "/#inicio", label: "Inicio" },
  { href: "/#carta", label: "Carta" },
  { href: "/#reservas", label: "Reservas" },
  { href: "/#esencia", label: "Nosotros" },
] as const

function SiteFooter() {
  return (
    <footer className="border-t border-olive-line bg-cream">
      <Container className="flex flex-col gap-8 py-12 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-heading text-4xl leading-none font-black tracking-[-0.04em]">PIÙ</p>
          <p className="mt-3 font-label text-xs font-semibold tracking-[0.16em] text-olive-muted uppercase">
            Pizza & Dolce
          </p>
        </div>
        <nav aria-label="Pie de página" className="flex flex-col">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={cn(textLinkVariants({ variant: "nav" }), "px-1")}>
              {link.label}
            </Link>
          ))}
        </nav>
      </Container>
    </footer>
  )
}

export { SiteFooter }
