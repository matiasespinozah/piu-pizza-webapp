import type { StaticImageData } from "next/image"
import Image from "next/image"
import Link from "next/link"
import { Fraunces } from "next/font/google"

import cocina from "@/assets/about/cocina-nosotros.webp"
import cocinaSmall from "@/assets/about/cocina-nosotros-1200.webp"
import equipo from "@/assets/about/equipo-2-anos.webp"
import interior from "@/assets/about/interior-nosotros.webp"
import interiorSmall from "@/assets/about/interior-nosotros-1200.webp"
import horno from "@/assets/about/llegada-horno.webp"
import maestro from "@/assets/about/maestro-2023.webp"
import primerDia from "@/assets/about/primer-dia.webp"
import daniele from "@/assets/about/primera-visita-maestro.webp"
import italia from "@/assets/about/segundo-lugar-2026.webp"
import { StoryFrame } from "@/components/features/about/story-frame"
import { Button } from "@/components/ui/button"
import { ResponsivePhoto } from "@/components/ui/responsive-photo"
import { Eyebrow, Heading, Text } from "@/components/ui/typography"
import { cn } from "cn"

const editorial = Fraunces({
  subsets: ["latin"],
  style: "italic",
  weight: "500",
  display: "swap",
})

const drives = [
  {
    number: "01",
    title: "Nuestra masa",
    body: "Creemos que una buena pizza comienza mucho antes de entrar al horno. Por eso respetamos los tiempos de fermentación, cuidamos cada proceso y buscamos mejorar constantemente.",
  },
  {
    number: "02",
    title: "El cariño por lo artesanal",
    body: "Desde nuestras pizzas hasta la pastelería, nos gusta preparar las cosas con dedicación, buenos ingredientes y atención a los detalles.",
  },
  {
    number: "03",
    title: "Nuestra gente",
    body: "PIÙ no sería lo mismo sin las personas que trabajan con nosotros ni sin quienes nos han acompañado desde el primer día. Creemos en crecer juntos y en cuidar ese ambiente familiar que nos caracteriza.",
  },
  {
    number: "04",
    title: "Hacer las cosas bien",
    body: "Preferimos volver a preparar algo antes que entregar un producto del que no estemos orgullosos. Para nosotros, la calidad no se negocia.",
  },
  {
    number: "05",
    title: "Seguir siendo de barrio",
    body: "Nacimos en Maipú y nos encanta recibir a vecinos, familias y amigos. Queremos que cada persona que entre a PIÙ se sienta bienvenida y siempre tenga ganas de volver.",
  },
] as const

function HistoryPhoto({
  side,
  image,
  small,
  alt,
  caption,
  className,
  frameClassName,
  captionClassName,
  sizes,
}: {
  side: "left" | "right"
  image: StaticImageData
  /** La misma foto en ~1200 px para celulares, si la original es más ancha. */
  small?: StaticImageData
  alt: string
  caption?: string
  className?: string
  frameClassName?: string
  captionClassName?: string
  sizes: string
}) {
  return (
    <StoryFrame side={side} className={className}>
      <figure>
        <div className={cn("overflow-hidden bg-olive", frameClassName)}>
          {small ? (
            <ResponsivePhoto src={image} small={small} alt={alt} placeholder="blur" sizes={sizes} className="h-auto w-full" />
          ) : (
            <Image src={image} alt={alt} placeholder="blur" sizes={sizes} className="h-auto w-full" />
          )}
        </div>
        {caption ? (
          <figcaption className={cn("mt-3 text-sm leading-snug text-olive-muted", captionClassName)}>{caption}</figcaption>
        ) : null}
      </figure>
    </StoryFrame>
  )
}

function AboutStory() {
  return (
    <div>
      <div className="mx-auto flex w-full max-w-[1200px] flex-col px-4 sm:px-6 lg:px-8">
        <header className="pt-8 pb-12 sm:pt-14 sm:pb-16 lg:pt-20 lg:pb-24">
          <Eyebrow className="text-terracotta">Nuestra historia</Eyebrow>
          <Heading as="h1" size="display" className="mt-4 max-w-[10ch] text-olive">
            Quiénes somos
          </Heading>
          <Text size="lead" className="mt-5 max-w-[34rem] border-t border-olive-line pt-5">
            Somos Felipe y Camila, una familia detrás de un sueño que comenzó en la cocina de nuestra casa, en Maipú.
          </Text>
        </header>

        <section className="border-l-2 border-terracotta py-1 pl-5 pb-14 md:max-w-[38rem] md:pb-20">
          <Eyebrow className="text-terracotta">La casa</Eyebrow>
          <Text className="mt-4">
            Todo partió durante la pandemia, cuando Felipe comenzó a preparar pizzas para amigos y conocidos, con un horno
            convencional, apenas $50.000 y muchas ganas de aprender. Lo que empezó como algo pequeño fue creciendo, y con
            ello también las ganas de llevar nuestras pizzas a otro nivel.
          </Text>
        </section>

        <section className="pb-16 md:pb-28">
          <Eyebrow className="text-terracotta">2023</Eyebrow>
          <Text className="mt-4 max-w-[40rem]">
            Después de años de práctica, de aprender con chefs profesionales y con nuestro maestro Daniele, y de mucho
            esfuerzo, llegó uno de nuestros primeros grandes logros. En 2023, Felipe se convirtió en campeón nacional del
            concurso Maestri Pizzaioli, un reconocimiento que también nos permitió conseguir nuestro primer horno
            profesional.
          </Text>
          <HistoryPhoto
            side="left"
            image={maestro}
            alt="Felipe Tapia, campeón nacional del concurso Maestri Pizzaioli en 2023."
            caption="Felipe Tapia · Campeón nacional Maestri Pizzaioli, 2023."
            className="mt-8 md:mt-12 md:max-w-[28rem]"
            frameClassName="-mx-4 sm:-mx-6 md:mx-0 md:rounded-2xl"
            sizes="(max-width: 768px) 100vw, 28rem"
          />
        </section>

        <section className="pb-16 md:pb-28">
          <Eyebrow className="text-terracotta">Santa Rosa</Eyebrow>
          <Text className="mt-4 max-w-[40rem]">
            Ese mismo año nos atrevimos a abrir nuestro primer local en Santa Rosa, Maipú. Todavía recordamos con mucho
            cariño nuestro primer día de atención, donde comenzó a tomar forma todo lo que hoy somos.
          </Text>
          <HistoryPhoto
            side="right"
            image={primerDia}
            alt="Primer día de atención de PIÙ en Santa Rosa, Maipú, en 2023."
            caption="Nuestro primer día de atención · Santa Rosa, 2023."
            className="mt-8 md:mt-12"
            frameClassName="-mx-4 sm:-mx-6 md:mx-0 md:rounded-2xl"
            sizes="(max-width: 768px) 100vw, 72rem"
          />
          <HistoryPhoto
            side="left"
            image={daniele}
            alt="Primera visita del maestro Daniele a PIÙ."
            caption="La primera visita de nuestro maestro Daniele a PIÙ."
            className="mt-12 md:mt-16 md:ml-auto md:w-[62%]"
            frameClassName="rounded-2xl shadow-lift"
            sizes="(max-width: 768px) 100vw, 42vw"
          />
        </section>

        <section className="grid items-center gap-8 pb-16 md:grid-cols-12 md:gap-x-10 md:pb-28">
          <div className="flex max-w-[38rem] flex-col gap-5 md:col-span-5">
            <Eyebrow className="text-terracotta">Camila</Eyebrow>
            <Text>
              PIÙ también tiene mucho de Camila. Su pasión por la pastelería artesanal nos permitió crear un espacio donde
              las pizzas y los dulces comparten el mismo cariño por las cosas bien hechas.
            </Text>
            <p className="font-heading text-[clamp(1.85rem,4vw,2.75rem)] leading-[1.12] font-extrabold tracking-[-0.03em] text-olive">
              Hasta nuestro nombre nació en familia. <span className={editorial.className}>PIÙ</span> fue una de las primeras
              palabras de nuestro hijo y significa{" "}
              <span className={cn(editorial.className, "text-terracotta")}>«más»</span> en italiano.
            </p>
            <Text>Y eso es justamente lo que queremos entregar: un poquito más de dedicación, de sabor y de cariño en cada visita.</Text>
          </div>
          <HistoryPhoto
            side="right"
            image={cocina}
            small={cocinaSmall}
            alt="Cocina de PIÙ: mesón con el logo, horno de piedra y lámparas de mimbre."
            className="md:col-span-6 md:col-start-7"
            frameClassName="-mx-4 sm:-mx-6 md:mx-0 md:rounded-2xl"
            sizes="(max-width: 768px) 100vw, 46vw"
          />
        </section>

        <section className="grid items-center gap-8 pb-16 md:grid-cols-12 md:gap-12 md:pb-28">
          <div className="md:col-span-6 md:max-w-[36rem]">
            <Eyebrow className="text-terracotta">La familia</Eyebrow>
            <Text className="mt-4">
              Con el tiempo llegaron más clientes, nuevos desafíos y personas maravillosas que se fueron sumando al equipo.
              Lo que alguna vez comenzó con unas pocas manos trabajando en un pequeño local, hoy es una familia mucho más
              grande.
            </Text>
          </div>
          <HistoryPhoto
            side="right"
            image={equipo}
            alt="El equipo de PIÙ reunido después de dos años creciendo juntos."
            caption="Nuestra familia PIÙ, después de dos años creciendo juntos."
            className="md:col-span-4 md:col-start-9"
            frameClassName="rounded-2xl bg-surface-raised p-2 shadow-lift md:p-3"
            sizes="(max-width: 768px) 100vw, 28vw"
          />
        </section>
      </div>

      <section className="bg-olive text-cream">
        <div className="mx-auto grid max-w-[1200px] items-center gap-8 px-4 py-14 sm:px-6 md:grid-cols-12 md:gap-12 md:py-24 lg:px-8">
          <div className="md:col-span-6">
            <Eyebrow className="text-terracotta-soft">Italia</Eyebrow>
            <p className="mt-3 font-heading text-[clamp(4.5rem,22vw,8.5rem)] leading-[0.82] font-black tracking-[-0.05em] text-terracotta-soft">
              2026
            </p>
            <Text className="mt-5 max-w-[36rem] text-cream">
              Y en noviembre de 2026 vivimos otro momento que jamás olvidaremos. Felipe viajó a Italia para participar en el
              Campionato Mondiale Pizza DOC, donde consiguió el segundo lugar mundial en la categoría Pizza Margherita DOC.
            </Text>
          </div>
          <HistoryPhoto
            side="left"
            image={italia}
            alt="Felipe Tapia, segundo lugar mundial en Pizza Margherita DOC, Italia, 2026."
            caption="Felipe Tapia · Segundo lugar mundial Pizza Margherita DOC, Italia 2026."
            className="mx-auto w-full max-w-sm md:col-span-4 md:col-start-8 md:mx-0 md:max-w-none"
            frameClassName="rounded-2xl"
            captionClassName="text-terracotta-soft"
            sizes="(max-width: 768px) 100vw, 24rem"
          />
        </div>
        <div className="mx-auto max-w-[1200px] px-4 pt-4 pb-14 sm:px-6 md:pt-8 md:pb-24 lg:px-8">
          <HistoryPhoto
            side="right"
            image={horno}
            alt="Llegada del segundo horno profesional de PIÙ en 2026."
            caption="La llegada de nuestro segundo horno profesional, 2026."
            frameClassName="rounded-2xl"
            captionClassName="text-terracotta-soft"
            sizes="(max-width: 768px) 100vw, 72rem"
          />
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <section className="grid items-start gap-8 py-14 md:grid-cols-12 md:gap-12 md:py-24">
          <HistoryPhoto
            side="left"
            image={interior}
            small={interiorSmall}
            alt="Interior de PIÙ: mesas, mesón y el logo junto a la barra."
            className="md:sticky md:top-24 md:col-span-5"
            frameClassName="-mx-4 sm:-mx-6 md:mx-0 md:rounded-2xl"
            sizes="(max-width: 768px) 100vw, 40vw"
          />
          <div className="md:col-span-6 md:col-start-7">
            <Text>Hoy seguimos creciendo, aprendiendo y disfrutando lo que hacemos, sin olvidar de dónde venimos.</Text>
            <Heading as="h2" size="h2" className="mt-10 text-olive">
              Lo que nos mueve
            </Heading>
            <ol className="mt-6">
              {drives.map((item) => (
                <li key={item.number} className="grid grid-cols-[2.5rem_1fr] gap-3 border-t border-olive-line py-5">
                  <span className="pt-1 font-label text-xs font-semibold tracking-[0.14em] text-terracotta">{item.number}</span>
                  <div>
                    <h3 className="font-heading text-xl font-bold tracking-[-0.02em] text-olive">{item.title}</h3>
                    <Text className="mt-2 max-w-[58ch]">{item.body}</Text>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <footer className="border-t border-olive-line py-14 sm:py-20 lg:py-28">
          <p className="max-w-[16ch] font-heading text-[clamp(2.25rem,6vw,4.25rem)] leading-[0.98] font-extrabold tracking-[-0.03em] text-olive sm:max-w-[14ch]">
            Gracias por acompañarnos y ser parte de esta historia.
          </p>
          <p className={cn(editorial.className, "mt-6 text-xl text-olive-strong")}>Felipe y Camila — PIÙ Pizza & Dolce</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="primary" size="lg" className="h-12">
              <Link href="/carta">Conoce nuestra carta</Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="h-12">
              <Link href="/reservas">Reservar una mesa</Link>
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}

export { AboutStory }
