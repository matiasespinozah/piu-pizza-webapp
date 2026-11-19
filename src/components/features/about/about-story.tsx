import type { StaticImageData } from "next/image"
import Image from "next/image"
import Link from "next/link"
import { Fraunces } from "next/font/google"

import interior from "@/assets/home/piu-portada.webp"
import terraza from "@/assets/home/terraza.webp"
import { StoryFrame } from "@/components/features/about/story-frame"
import { Button } from "@/components/ui/button"
import { Eyebrow, Heading, Text } from "@/components/ui/typography"
import { cn } from "cn"

/**
 * Fotos reales del local. Las otras dos esperan archivo en src/assets/home/:
 * inicios.webp (la cocina de Maipú) y familia.webp (Felipe, Camila o el equipo).
 * No uses una foto de stock ni un retrato generado.
 */
const interiorImage: StaticImageData | undefined = interior
const terrazaImage: StaticImageData | undefined = terraza

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

function PendingPhoto({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex h-full min-h-64 flex-col justify-end bg-surface-raised px-5 py-6 sm:px-7">
      <Eyebrow className="text-terracotta">Fotografía pendiente</Eyebrow>
      <p className="mt-3 font-heading text-2xl leading-tight font-extrabold tracking-[-0.02em] text-olive">{title}</p>
      <Text className="mt-3 max-w-[28ch] text-olive-muted">{note}</Text>
    </div>
  )
}

function StoryPhoto({
  side,
  image,
  alt,
  pendingTitle,
  pendingNote,
  className,
  frameClassName,
  sizes,
}: {
  side: "left" | "right"
  image?: StaticImageData
  alt?: string
  pendingTitle: string
  pendingNote: string
  className?: string
  frameClassName?: string
  sizes: string
}) {
  return (
    <StoryFrame side={side} className={className}>
      <figure className={cn("relative overflow-hidden rounded-2xl", frameClassName)}>
        {image ? (
          <Image src={image} alt={alt ?? pendingTitle} fill placeholder="blur" sizes={sizes} className="object-cover" />
        ) : (
          <PendingPhoto title={pendingTitle} note={pendingNote} />
        )}
      </figure>
    </StoryFrame>
  )
}

function AboutStory() {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col px-4 sm:px-6 lg:px-8">
      <header className="max-w-[40rem] pt-10 pb-16 sm:pt-16 sm:pb-24 lg:pt-24 lg:pb-32">
        <Eyebrow className="text-terracotta">Nuestra historia</Eyebrow>
        <Heading as="h1" size="display" className="mt-5 text-olive">
          Quiénes somos
        </Heading>
        <Text size="lead" className="mt-6 max-w-[38rem]">
          Somos Felipe y Camila, una familia detrás de un sueño que comenzó en la cocina de nuestra casa, en Maipú.
        </Text>
      </header>

      <section className="grid items-center gap-8 pb-20 md:grid-cols-12 md:gap-10 md:pb-28">
        <div className="max-w-[65ch] md:col-span-5">
          <Text>
            Todo partió durante la pandemia, cuando Felipe comenzó a preparar pizzas para amigos y conocidos, con un horno
            convencional, apenas $50.000 y muchas ganas de aprender. Lo que empezó como algo pequeño fue creciendo, y con
            ello también las ganas de llevar nuestras pizzas a otro nivel.
          </Text>
        </div>
        <StoryPhoto
          side="right"
          pendingTitle="Los inicios"
          pendingNote="La cocina de la casa, en Maipú. El archivo va en src/assets/home/inicios.webp."
          className="md:col-span-5 md:col-start-8 lg:-me-14"
          frameClassName="aspect-[3/4] md:aspect-[3/5]"
          sizes="(max-width: 768px) 100vw, 38vw"
        />
      </section>

      <section className="grid items-center gap-8 pb-20 md:grid-cols-12 md:gap-10 md:pb-32">
        <div className="max-w-[65ch] md:col-span-5 md:col-start-8">
          <Text>
            Después de años de práctica, aprendizaje y mucho esfuerzo, llegó uno de nuestros primeros grandes logros: en
            2023, Felipe se convirtió en campeón nacional del concurso Maestri Pizzaioli. Ese mismo año nos atrevimos a
            abrir nuestro primer local en Santa Rosa, donde comenzó a tomar forma todo lo que hoy somos.
          </Text>
        </div>
        <StoryPhoto
          side="left"
          pendingTitle="El primer local"
          pendingNote="Una foto del concurso o de Santa Rosa, cuando exista. Va en src/assets/home/primer-local.webp."
          className="md:col-span-6 md:col-start-1 md:row-start-1 lg:-ms-16"
          frameClassName="aspect-[4/3]"
          sizes="(max-width: 768px) 100vw, 48vw"
        />
      </section>

      <section className="grid items-center gap-8 pb-20 md:grid-cols-12 md:gap-x-8 md:pb-28">
        <div className="flex max-w-[65ch] flex-col gap-6 md:col-span-5">
          <Text>
            PIÙ también tiene mucho de Camila. Su pasión por la pastelería artesanal nos permitió crear un espacio donde
            las pizzas y los dulces comparten el mismo cariño por las cosas bien hechas.
          </Text>
          <p className="font-heading text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.15] font-extrabold tracking-[-0.03em] text-olive">
            Hasta nuestro nombre nació en familia. <span className={editorial.className}>PIÙ</span> fue una de las primeras
            palabras de nuestro hijo y significa{" "}
            <span className={cn(editorial.className, "text-terracotta")}>«más»</span> en italiano.
          </p>
          <Text>Y eso es justamente lo que queremos entregar: un poquito más de dedicación, de sabor y de cariño en cada visita.</Text>
        </div>
        <StoryPhoto
          side="right"
          image={interiorImage}
          alt="Mesón de PIÙ con el logo, el horno de piedra y la vitrina."
          pendingTitle="El local"
          pendingNote="Mesón y horno."
          className="md:col-span-6 md:col-start-7 lg:-me-10"
          frameClassName="aspect-[4/5] md:aspect-[5/6]"
          sizes="(max-width: 768px) 100vw, 46vw"
        />
      </section>

      <section className="grid items-start gap-10 pb-8 md:grid-cols-12 md:gap-12 md:pb-16">
        <div className="md:col-span-6 md:col-start-7">
          <Text>Hoy seguimos creciendo, aprendiendo y disfrutando lo que hacemos, sin olvidar de dónde venimos.</Text>
          <Heading as="h2" size="h2" className="mt-12 text-olive">
            Lo que nos mueve
          </Heading>
          <ol className="mt-8">
            {drives.map((item) => (
              <li key={item.number} className="grid grid-cols-[2.5rem_1fr] gap-3 border-t border-olive-line py-6">
                <span className="pt-1 font-label text-xs font-semibold tracking-[0.14em] text-terracotta">{item.number}</span>
                <div>
                  <h3 className="font-heading text-xl font-bold tracking-[-0.02em] text-olive">{item.title}</h3>
                  <Text className="mt-2 max-w-[58ch]">{item.body}</Text>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <StoryPhoto
          side="left"
          image={terrazaImage}
          alt="Terraza de PIÙ, con mesas de madera, sillas negras y luces cálidas."
          pendingTitle="La terraza"
          pendingNote="El lugar para quedarse."
          className="md:col-span-5 md:col-start-1 md:row-start-1 lg:-ms-12"
          frameClassName="aspect-[5/4] md:aspect-[4/5]"
          sizes="(max-width: 768px) 100vw, 40vw"
        />
      </section>

      <footer className="border-t border-olive-line py-16 sm:py-20 lg:py-28">
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
  )
}

export { AboutStory }
