import { Fraunces } from "next/font/google"
import Image from "next/image"
import Link from "next/link"
import { CalendarIcon, ChevronDownIcon, UtensilsCrossedIcon } from "lucide-react"

import comida from "@/assets/home/comida.webp"
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

function Hero() {
  return (
    <section id="inicio" className="relative min-h-svh scroll-mt-0 bg-olive">
      <div className="hero-frame absolute inset-0 overflow-hidden">
        <div className="hero-photo absolute inset-0">
          <Image
            src={comida}
            alt="Mesa de PIÙ con pizzas, tiramisú, café y el horno de la cocina al fondo."
            fill
            priority
            placeholder="blur"
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>
        <div className="hero-scrim pointer-events-none absolute inset-0" aria-hidden />
      </div>

      <div className="relative z-10 flex min-h-svh flex-col justify-start px-4 pt-[calc(env(safe-area-inset-top)+6.25rem)] pb-28 sm:px-6 lg:justify-center lg:px-8 lg:pt-28 lg:pb-20">
        <div className="w-full max-w-[20rem] sm:max-w-[22rem] lg:max-w-[24rem] xl:max-w-[28rem]">
          <div className="hero-rise hero-rise-1 flex items-center gap-3">
            <span className="h-px w-8 bg-terracotta-soft" aria-hidden />
            <Eyebrow className="text-terracotta-soft">Pizza & Dolce</Eyebrow>
          </div>

          <p className="hero-rise hero-rise-2 mt-3 font-heading text-[clamp(3.5rem,16vw,9.25rem)] leading-[0.82] font-black tracking-[-0.045em] text-cream lg:mt-4">
            PIÙ
          </p>
          <p className="hero-rise hero-rise-2 mt-2 font-label text-xs font-semibold tracking-[0.22em] text-cream uppercase sm:text-sm lg:mt-3">
            Pizza & Dolce
          </p>

          <h1
            className={`${editorial.className} hero-title hero-rise hero-rise-3 mt-4 max-w-[16ch] text-[clamp(1.75rem,4.2vw,3.25rem)] leading-[1.12] font-medium lg:mt-6`}
          >
            Buena comida,
            <br />
            mejores momentos.
          </h1>

          <p className="hero-rise hero-rise-4 mt-3 max-w-sm text-base leading-6 text-cream lg:mt-5 lg:leading-7">
            Pizzas artesanales, ingredientes reales y un ambiente pensado para disfrutar sin apuro.
          </p>

          <div className="hero-rise hero-rise-5 mt-5 flex flex-col gap-3 sm:flex-row lg:mt-8">
            <ComingSoonButton
              title="Reservas"
              message="La reserva en línea estará disponible próximamente."
              variant="accent"
              size="lg"
              className="w-full sm:w-auto"
            >
              <CalendarIcon aria-hidden />
              Reservar una mesa
            </ComingSoonButton>
            <Button asChild variant="onPhoto" size="lg" className="w-full sm:w-auto">
              <Link href="/#carta">
                <UtensilsCrossedIcon aria-hidden />
                Ver la carta
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <Link
        href="/#esencia"
        className="hero-cue absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-10 inline-flex size-11 items-center justify-center rounded-full text-cream outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-cream sm:left-8"
        aria-label="Bajar a la siguiente sección"
      >
        <ChevronDownIcon className="hero-cue-icon size-6" aria-hidden />
      </Link>
    </section>
  )
}

export { Hero }
