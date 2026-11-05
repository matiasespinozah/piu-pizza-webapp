import { Container } from "@/components/ui/layout"
import { Eyebrow } from "@/components/ui/typography"

/** Entrada compacta de `/carta`: tipográfica, sin fotografía. */
function MenuHeader() {
  return (
    <header className="bg-cream pt-10 pb-7 sm:pt-14 sm:pb-9 lg:pt-20 lg:pb-12">
      <Container>
        <div className="hero-rise hero-rise-1 flex items-center gap-3">
          <span className="h-px w-7 bg-terracotta" aria-hidden />
          <Eyebrow className="text-terracotta">Pizza & Dolce</Eyebrow>
        </div>
        <h1 className="hero-rise hero-rise-2 mt-5 font-heading text-[clamp(2.75rem,10vw,5.5rem)] leading-[0.98] font-black tracking-[-0.04em] text-olive">
          Nuestra carta.
        </h1>
        <p className="hero-rise hero-rise-3 mt-4 max-w-[28rem] text-lg leading-[1.45] text-olive-strong sm:text-xl">
          Sabores para compartir, momentos para recordar.
        </p>
      </Container>
    </header>
  )
}

export { MenuHeader }
