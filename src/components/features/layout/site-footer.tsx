import Image from "next/image"
import Link from "next/link"
import { cn } from "cn"

import { CopyrightYear } from "@/components/features/layout/copyright-year"
import { Container } from "@/components/ui/layout"
import { textLinkVariants } from "@/components/ui/text-link"
import { footerNav, openingHours, socialLinks } from "@/lib/site"

function SiteFooter() {
  return (
    <footer className="bg-olive text-cream">
      <Container className="grid gap-12 py-16 sm:py-20 lg:grid-cols-3 lg:gap-16 lg:py-24">
        <div>
          <p className="font-heading text-[2.75rem] leading-none font-black tracking-[-0.045em]">PIÙ</p>
          <p className="mt-3 font-label text-xs font-semibold tracking-[0.16em] text-terracotta-soft uppercase">
            Pizza & Dolce
          </p>
          <p className="mt-6 max-w-[16rem] text-base leading-6 text-cream/85 italic">
            Buena comida, mejores momentos.
          </p>
        </div>

        <nav aria-label="Pie de página" className="flex flex-col">
          <p className="font-label text-xs font-semibold tracking-[0.16em] text-terracotta-soft uppercase">
            Explorar
          </p>
          <ul className="mt-5">
            {footerNav.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    textLinkVariants({ variant: "nav" }),
                    "px-0 text-cream decoration-terracotta-soft hover:text-terracotta-soft focus-visible:outline-cream"
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col gap-10">
          <div>
            <h2 className="font-label text-xs font-semibold tracking-[0.16em] text-terracotta-soft uppercase">
              Horarios de atención
            </h2>
            <dl className="mt-5 space-y-3 text-[0.9375rem] leading-5">
              {openingHours.map((row) => (
                <div key={row.days} className="flex max-w-[22rem] justify-between gap-6">
                  <dt className="text-cream/80">{row.days}</dt>
                  <dd className="font-label font-semibold tabular-nums">{row.hours}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <p className="font-label text-xs font-semibold tracking-[0.16em] text-terracotta-soft uppercase">
              Síguenos
            </p>
            <ul className="mt-4 flex gap-2">
              {socialLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${link.name} de PIÙ, se abre en una pestaña nueva`}
                    className="inline-flex size-11 items-center justify-center rounded-xl outline-none transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-cream"
                  >
                    <Image
                      src={link.icon}
                      alt=""
                      width={32}
                      height={32}
                      className="size-8 overflow-hidden rounded-xl object-cover"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>

      <div className="border-t border-[color-mix(in_srgb,var(--brand-cream),transparent_82%)]">
        <Container className="py-6 pe-16 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pe-20">
          <p className="text-sm leading-5 text-cream/70">
            © <CopyrightYear /> PIÙ Pizza & Dolce. Todos los derechos reservados.
          </p>
        </Container>
      </div>
    </footer>
  )
}

export { SiteFooter }
