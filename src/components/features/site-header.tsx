"use client"

import * as React from "react"
import Link from "next/link"
import { MenuIcon } from "lucide-react"
import { cn } from "cn"

import { ComingSoonButton } from "@/components/features/coming-soon-button"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { textLinkVariants } from "@/components/ui/text-link"

const links = [
  { href: "/#inicio", id: "inicio", label: "Inicio" },
  { href: "/#carta", id: "carta", label: "Carta" },
  { href: "/#esencia", id: "esencia", label: "Nosotros" },
  { href: "/#reservas", id: "reservas", label: "Reservas" },
] as const

const sectionOrder = ["inicio", "carta", "esencia", "reservas"] as const

const reserveMessage = "La reserva en línea estará disponible próximamente."

function SiteHeader() {
  const [scrolled, setScrolled] = React.useState(false)
  const [active, setActive] = React.useState<(typeof sectionOrder)[number]>("inicio")

  React.useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12)
      const mark = window.scrollY + 96
      let current: (typeof sectionOrder)[number] = "inicio"
      for (const id of sectionOrder) {
        const section = document.getElementById(id)
        if (section && section.offsetTop <= mark) current = id
      }
      setActive(current)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      data-scrolled={scrolled ? "" : undefined}
      className="group fixed inset-x-0 top-0 z-40 bg-olive pt-safe text-cream md:bg-transparent md:shadow-none md:transition-[background-color,box-shadow] md:duration-300 md:data-[scrolled]:bg-olive md:data-[scrolled]:shadow-tactile motion-reduce:transition-none"
    >
      <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center gap-3 px-6 transition-[height] duration-300 motion-reduce:transition-none md:h-16 md:group-data-[scrolled]:h-14 lg:gap-6 lg:px-8">
        <Link
          href="/#inicio"
          className="inline-flex shrink-0 rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-cream"
        >
          <Logo size={40} alt="" className="size-9 md:size-10" />
          <span className="sr-only">PIÙ, ir al inicio</span>
        </Link>

        <nav aria-label="Principal" className="ms-auto hidden items-center gap-1 lg:gap-2 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active === link.id ? "page" : undefined}
              className={cn(
                textLinkVariants({ variant: "nav" }),
                "px-2.5 text-cream decoration-terracotta underline-offset-[0.7rem] hover:text-cream focus-visible:outline-cream aria-[current=page]:underline"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <ComingSoonButton
          title="Reservas"
          message={reserveMessage}
          variant="accent"
          size="md"
          className="ms-1 hidden md:inline-flex"
        >
          Reservar
        </ComingSoonButton>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="ms-auto text-cream hover:bg-[color-mix(in_srgb,var(--brand-cream),transparent_88%)] hover:text-cream focus-visible:outline-cream md:hidden"
              aria-label="Abrir menú"
            >
              <MenuIcon />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="pb-safe rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>PIÙ</SheetTitle>
              <SheetDescription>Pizza & Dolce</SheetDescription>
            </SheetHeader>
            <nav aria-label="Móvil" className="flex flex-col gap-1 px-3 pb-2">
              {links.map((link) => (
                <SheetClose asChild key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active === link.id ? "page" : undefined}
                    className={cn(
                      textLinkVariants({ variant: "nav" }),
                      "w-full px-1 decoration-terracotta aria-[current=page]:underline"
                    )}
                  >
                    {link.label}
                  </Link>
                </SheetClose>
              ))}
            </nav>
            <div className="px-4 pb-4">
              <ComingSoonButton title="Reservas" message={reserveMessage} variant="accent" className="w-full">
                Reservar una mesa
              </ComingSoonButton>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}

export { SiteHeader }
