"use client"

import * as React from "react"
import Link from "next/link"
import { MenuIcon } from "lucide-react"
import { cn } from "cn"

import { Button, buttonVariants } from "@/components/ui/button"
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
  { href: "/carta", id: "carta", label: "Carta" },
  { href: "/#esencia", id: "esencia", label: "Nosotros" },
  { href: "/reservas", id: "reservas", label: "Reservas" },
] as const

const sectionOrder = ["inicio", "esencia"] as const

type SiteHeaderProps = {
  /** `home` sigue el scroll de las secciones; el resto usa la barra sólida. */
  page?: "home" | "carta" | "reservas"
}

function SiteHeader({ page = "home" }: SiteHeaderProps) {
  const [scrolled, setScrolled] = React.useState(false)
  const [homeActive, setActive] = React.useState<(typeof sectionOrder)[number]>("inicio")
  const solid = page !== "home"
  const active = solid ? page : homeActive

  React.useEffect(() => {
    if (solid) return

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
  }, [solid])

  return (
    <header
      data-scrolled={scrolled ? "" : undefined}
      data-solid={solid ? "" : undefined}
      className="group fixed inset-x-0 top-0 z-40 bg-cream pt-safe text-olive data-[solid]:border-b data-[solid]:border-olive-line md:bg-transparent md:text-cream md:shadow-none md:transition-[background-color,box-shadow,color] md:duration-300 md:data-[scrolled]:bg-olive md:data-[scrolled]:shadow-tactile md:data-[solid]:border-transparent md:data-[solid]:bg-olive md:data-[solid]:shadow-tactile motion-reduce:transition-none"
    >
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-3 px-5 transition-[height] duration-300 motion-reduce:transition-none sm:px-6 md:h-16 md:group-data-[scrolled]:h-14 lg:gap-6 lg:px-8">
        <Link
          href="/#inicio"
          className="inline-flex shrink-0 rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-olive md:focus-visible:outline-cream"
        >
          <Logo size={56} alt="" className="size-[3.25rem] md:size-11" />
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

        <Button asChild variant="accent" size="md" className="ms-1 hidden md:inline-flex">
          <Link href="/reservas">Reservar</Link>
        </Button>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="ms-auto text-olive hover:bg-olive-hover hover:text-olive focus-visible:outline-olive md:hidden"
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
              <SheetClose asChild>
                <Link href="/reservas" className={cn(buttonVariants({ variant: "accent", size: "md" }), "w-full")}>
                  Reservar una mesa
                </Link>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}

export { SiteHeader }
