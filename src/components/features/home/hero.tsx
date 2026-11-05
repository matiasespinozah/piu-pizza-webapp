import { Fraunces } from "next/font/google"
import Image from "next/image"
import Link from "next/link"
import { CalendarIcon, ChevronDownIcon, UtensilsCrossedIcon } from "lucide-react"

import comida from "@/assets/home/comida.webp"
import { ComingSoonButton } from "@/components/features/coming-soon-button"
import { Button } from "@/components/ui/button"

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

function Hero() {
  return (
    <section id="inicio" className="relative scroll-mt-0 bg-olive md:min-h-[88svh] md:overflow-hidden">
      <div className="relative z-10 flex flex-col px-6 pt-[calc(env(safe-area-inset-top)+3.75rem)] pb-8 md:min-h-[88svh] md:justify-center md:px-8 md:pt-24 md:pb-14">
        <div className="flex w-full flex-col md:max-w-[34rem] md:translate-x-[4vw] lg:translate-x-[5vw]">
          <div className="hero-rise hero-rise-2 hidden md:block">
            <p className="font-heading text-[clamp(2.75rem,10vw,5.5rem)] leading-[0.84] font-black tracking-[-0.04em] text-cream">
              PIÙ
            </p>
            <p className="mt-1.5 font-label text-[0.68rem] font-semibold tracking-[0.2em] text-cream uppercase sm:text-xs">
              Pizza & Dolce
            </p>
          </div>

          <h1
            className={`${editorial.className} hero-title hero-rise hero-rise-3 mt-6 text-[clamp(2.3125rem,10.4vw,2.75rem)] leading-[1.14] font-medium tracking-[-0.02em] md:mt-4 md:text-[clamp(1.7rem,3.4vw,3.05rem)] md:leading-[1.08] md:tracking-[-0.015em]`}
          >
            Buena comida,
            <br />
            mejores momentos.
          </h1>

          <p className="hero-rise hero-rise-4 mt-5 max-w-[20.5rem] text-[0.9375rem] leading-6 text-cream md:mt-3 md:max-w-[34rem] md:text-base">
            Pizzas artesanales, ingredientes reales y un ambiente pensado para disfrutar sin apuro.
          </p>

          <div className="hero-rise hero-rise-5 mt-8 flex flex-col items-start gap-3 md:mt-5 md:flex-row md:items-center">
            <ComingSoonButton
              title="Reservas"
              message="La reserva en línea estará disponible próximamente."
              variant="accent"
              size="lg"
              className="md:w-auto"
            >
              <CalendarIcon aria-hidden />
              Reservar una mesa
            </ComingSoonButton>
            <Button
              asChild
              variant="link"
              className="min-h-11 px-1 text-cream decoration-cream/45 hover:decoration-cream md:hidden"
            >
              <Link href="/#carta">Ver la carta</Link>
            </Button>
            <Button asChild variant="onPhoto" size="lg" className="hidden md:inline-flex">
              <Link href="/#carta">
                <UtensilsCrossedIcon aria-hidden />
                Ver la carta
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="hero-mobile-shot relative h-[min(40svh,21rem)] min-h-52 w-full overflow-hidden md:absolute md:inset-[-2px] md:h-auto md:min-h-0">
        <Image
          src={comida}
          alt="Mesa de PIÙ con pizzas, tiramisú, café y el horno de la cocina al fondo."
          fill
          priority
          placeholder="blur"
          sizes="100vw"
          className="object-cover object-[62%_58%] md:object-[54%_center]"
        />
        <div className="hero-mobile-blend pointer-events-none absolute inset-0 md:hidden" aria-hidden />
        <div className="hero-scrim pointer-events-none absolute inset-0 hidden md:block" aria-hidden />
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
