import { Fraunces } from "next/font/google"
import { getImageProps } from "next/image"
import Link from "next/link"
import { CalendarIcon, ChevronDownIcon, UtensilsCrossedIcon } from "lucide-react"

import piuComidaMobile from "@/assets/home/piu-comida-mobile.webp"
import piuComida from "@/assets/home/piu-comida.webp"
import { ComingSoonButton } from "@/components/features/coming-soon-button"
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
  "Pizza margarita humeante sobre la mesa de PIÙ, con el horno de azulejos azules al fondo."

function HeroPhoto() {
  const common = { alt: heroAlt, sizes: "100vw" }
  const {
    props: { srcSet: desktop },
  } = getImageProps({ ...common, src: piuComida })
  const { props: rest } = getImageProps({ ...common, src: piuComidaMobile, priority: true })

  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={desktop} />
      <img
        {...rest}
        alt={heroAlt}
        className="absolute inset-0 size-full object-cover object-[center_58%] md:object-[46%_center]"
      />
    </picture>
  )
}

function Hero() {
  return (
    <section
      id="inicio"
      className="relative scroll-mt-0 bg-olive pt-[calc(env(safe-area-inset-top)+4rem)] md:min-h-[88svh] md:overflow-hidden md:pt-0"
    >
      <div className="hero-mobile-shot relative h-[64svh] min-h-[24rem] w-full overflow-hidden md:absolute md:inset-[-2px] md:h-auto md:min-h-0">
        <HeroPhoto />
        <div className="hero-mobile-overlay pointer-events-none absolute inset-0 md:hidden" aria-hidden />
        <div className="hero-scrim pointer-events-none absolute inset-0 hidden md:block" aria-hidden />
      </div>

      <div className="absolute inset-x-0 top-[calc(env(safe-area-inset-top)+4rem)] z-10 flex h-[64svh] min-h-[24rem] flex-col items-center px-3 pt-6 pb-7 text-center sm:px-5 md:relative md:top-0 md:h-auto md:min-h-[88svh] md:items-start md:justify-center md:px-8 md:pt-24 md:pb-14 md:text-left">
        <div className="flex w-full min-w-0 flex-col items-center md:max-w-[34rem] md:items-start md:translate-x-[4vw] lg:translate-x-[5vw]">
          <div className="hero-rise hero-rise-1 flex items-center justify-center gap-3 md:hidden">
            <span className="h-px w-6 bg-terracotta-soft" aria-hidden />
            <Eyebrow className="text-terracotta-soft">Pizza & Dolce</Eyebrow>
            <span className="h-px w-6 bg-terracotta-soft" aria-hidden />
          </div>

          <div className="hero-rise hero-rise-2 mt-3 hidden md:block">
            <p className="font-heading text-[clamp(2.75rem,10vw,5.5rem)] leading-[0.84] font-black tracking-[-0.04em] text-cream">
              PIÙ
            </p>
            <p className="mt-1.5 font-label text-[0.68rem] font-semibold tracking-[0.2em] text-cream uppercase sm:text-xs">
              Pizza & Dolce
            </p>
          </div>

          <h1
            className={`${editorial.className} hero-title hero-rise hero-rise-3 mt-3 w-full min-w-0 text-[clamp(1.35rem,6.6vw,1.85rem)] leading-[1.14] font-medium tracking-[-0.03em] md:mt-4 md:text-[clamp(1.7rem,3.4vw,3.05rem)] md:leading-[1.08] md:tracking-[-0.015em]`}
          >
            Buena comida,
            <br />
            mejores momentos.
          </h1>

          <p className="hero-rise hero-rise-4 mx-auto mt-3 w-full min-w-0 max-w-[17rem] text-[0.875rem] leading-5 text-cream/92 [text-shadow:0_1px_14px_rgba(22,27,16,0.55)] md:mx-0 md:mt-3 md:max-w-[34rem] md:text-base md:leading-6 md:[text-shadow:none]">
            Pizzas artesanales, ingredientes reales y un ambiente pensado para disfrutar sin apuro.
          </p>

          <div className="hero-rise hero-rise-5 mt-6 flex flex-col items-center gap-1 md:mt-5 md:flex-row md:items-center md:gap-3">
            <ComingSoonButton
              title="Reservas"
              message="La reserva en línea estará disponible próximamente."
              variant="accent"
              size="md"
              className="w-full max-w-[17rem] md:h-12 md:w-auto md:max-w-none md:px-6 md:text-base"
            >
              <CalendarIcon aria-hidden />
              Reservar una mesa
            </ComingSoonButton>
            <Button
              asChild
              variant="link"
              className="min-h-11 px-1 text-cream decoration-terracotta-soft hover:decoration-cream md:hidden"
            >
              <Link href="/carta">Ver la carta</Link>
            </Button>
            <Button asChild variant="onPhoto" size="lg" className="hidden md:inline-flex">
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
