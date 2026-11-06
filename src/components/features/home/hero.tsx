import { Fraunces } from "next/font/google"
import { getImageProps } from "next/image"
import Link from "next/link"
import { CalendarIcon, ChevronDownIcon, UtensilsCrossedIcon } from "lucide-react"

import piuPortadaMobile from "@/assets/home/piu-portada-mobile.webp"
import piuPortada from "@/assets/home/piu-portada.webp"
import { Button } from "@/components/ui/button"
import { Eyebrow } from "@/components/ui/typography"

/**
 * Titular solo del hero. El resto del sitio sigue en Anybody (DESIGN.md §3).
 * Un peso italic, servido por next/font desde el propio dominio.
 */
const editorial = Fraunces({
  subsets: ["latin"],
  style: "italic",
  weight: "500",
  display: "swap",
})

const heroAlt =
  "Interior de PIÙ: mesón con el logo, horno de piedra y lámparas de mimbre."

function HeroPhoto() {
  const common = { alt: heroAlt, sizes: "100vw" }
  const { props: desktop } = getImageProps({ ...common, src: piuPortada })
  const { props: mobile } = getImageProps({ ...common, src: piuPortadaMobile, priority: true })

  // Con el optimizador, getImageProps entrega srcSet. Sin optimizar
  // (el HTML publicado en App Hosting sirve el archivo estático y srcSet
  // queda undefined) un <source> sin srcset se descarta: el escritorio
  // usa la foto vertical y object-cover anclado abajo muestra el suelo.
  return (
    <picture>
      <source media="(min-width: 768px)" sizes={desktop.sizes} srcSet={desktop.srcSet || desktop.src} />
      <img
        {...mobile}
        alt={heroAlt}
        className="absolute inset-0 size-full object-cover object-[center_67%] md:object-[center_bottom]"
      />
    </picture>
  )
}

function Hero() {
  return (
    <section
      id="inicio"
      className="relative scroll-mt-0 bg-olive pt-[calc(env(safe-area-inset-top)+4rem)] md:overflow-hidden md:pt-0"
    >
      {/*
        Móvil: el alto sigue el ancho (no el svh) y recorta el suelo.
        El logo queda justo encima de los botones en cualquier teléfono.
        Escritorio: el alto sigue el clamp en vw.
      */}
      <div className="hero-mobile-shot relative aspect-[941/1120] w-full overflow-hidden md:absolute md:inset-[-2px] md:aspect-auto md:h-auto">
        <HeroPhoto />
        <div className="hero-mobile-overlay pointer-events-none absolute inset-0 md:hidden" aria-hidden />
        <div className="hero-scrim pointer-events-none absolute inset-0 hidden md:block" aria-hidden />
      </div>

      <div className="absolute inset-x-0 top-[calc(env(safe-area-inset-top)+4rem)] z-10 flex aspect-[941/1120] flex-col items-center px-3 pt-6 text-center sm:px-5 md:relative md:inset-auto md:aspect-auto md:h-[clamp(20rem,46vw,calc(100svh-8rem))] md:items-start md:justify-center md:px-8 md:pt-24 md:pb-14 md:text-left">
        <div className="flex w-full min-w-0 flex-col items-center md:max-w-[34rem] md:items-start md:translate-x-[4vw] lg:translate-x-[5vw]">
          <div className="hero-rise hero-rise-1 flex items-center justify-center gap-3 md:hidden">
            <span className="h-px w-6 bg-terracotta-soft" aria-hidden />
            <Eyebrow className="text-terracotta-soft">Pizza & Dolce</Eyebrow>
            <span className="h-px w-6 bg-terracotta-soft" aria-hidden />
          </div>

          <p className="hero-rise hero-rise-2 mt-3 hidden font-label text-[0.68rem] font-semibold tracking-[0.2em] text-cream uppercase sm:text-xs md:block">
            Pizza & Dolce
          </p>

          <h1
            className={`${editorial.className} hero-title hero-rise hero-rise-3 mt-3 w-full min-w-0 overflow-visible pb-[0.14em] text-[clamp(1.35rem,6.6vw,1.85rem)] leading-[1.28] font-medium tracking-[-0.03em] md:mt-4 md:text-[clamp(1.7rem,3.4vw,3.05rem)] md:leading-[1.22] md:tracking-[-0.015em]`}
          >
            Buena comida,
            <br />
            mejores momentos.
          </h1>

          <div className="hero-rise hero-rise-5 absolute bottom-4 left-1/2 flex w-[min(22rem,calc(100%-2rem))] -translate-x-1/2 items-stretch justify-center gap-2 md:static md:inset-auto md:mt-5 md:w-auto md:translate-x-0 md:flex-col md:items-start lg:flex-row lg:items-center lg:gap-3">
            <Button
              asChild
              variant="accent"
              size="md"
              className="h-11 min-w-0 flex-1 rounded-lg px-2 text-[0.75rem] shadow-tactile min-[380px]:px-3 min-[380px]:text-[0.8125rem] md:h-12 md:w-auto md:flex-none md:px-6 md:text-base"
            >
              <Link href="/reservas">
                <CalendarIcon aria-hidden />
                Reservar una mesa
              </Link>
            </Button>
            <Button
              asChild
              variant="primary"
              size="md"
              className="h-11 min-w-0 flex-1 rounded-lg px-2 text-[0.75rem] shadow-tactile min-[380px]:px-3 min-[380px]:text-[0.8125rem] md:h-12 md:w-auto md:flex-none md:px-6 md:text-base"
            >
              <Link href="/carta">
                <UtensilsCrossedIcon aria-hidden />
                Ver la carta
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <Link
        href="/#sugerencias"
        className="hero-cue absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-[calc(2rem+4vw)] z-10 hidden size-11 items-center justify-center text-cream outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-cream md:inline-flex lg:left-[calc(2rem+5vw)]"
        aria-label="Bajar a la siguiente sección"
      >
        <ChevronDownIcon className="hero-cue-icon size-6" aria-hidden />
      </Link>
    </section>
  )
}

export { Hero }
