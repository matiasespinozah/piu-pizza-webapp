"use client"

import { useState } from "react"
import Image, { type StaticImageData } from "next/image"
import { MousePointerClick } from "lucide-react"
import { cn } from "cn"

import interior from "@/assets/home/interior-lugar.webp"
import terraza from "@/assets/home/terraza-lugar.webp"

type PlaceId = "terraza" | "interior"

const places: { id: PlaceId; label: string; image: StaticImageData; alt: string }[] = [
  {
    id: "terraza",
    label: "Terraza",
    image: terraza,
    alt: "Terraza de PIÙ: mesas de madera bajo el toldo y las luces.",
  },
  {
    id: "interior",
    label: "Interior",
    image: interior,
    alt: "Interior de PIÙ: mesas, mesón y el logo junto a la barra.",
  },
]

function PlaceSwitcher() {
  const [place, setPlace] = useState<PlaceId | null>(null)

  function choose(id: PlaceId) {
    setPlace(id)
    document.getElementById(`lugar-${id}`)?.focus()
  }

  function move(key: string) {
    if (key !== "ArrowRight" && key !== "ArrowLeft") return
    const order = places.map((item) => item.id)
    const index = place === null ? (key === "ArrowRight" ? -1 : order.length) : order.indexOf(place)
    const next = order[index + (key === "ArrowRight" ? 1 : -1)]
    if (next) choose(next)
  }

  return (
    <div
      className="relative mt-8 overflow-hidden rounded-2xl bg-olive sm:aspect-[16/9] lg:mt-10 lg:aspect-[2/1]"
      onKeyDown={(event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return
        event.preventDefault()
        move(event.key)
      }}
    >
      <div className="flex flex-col sm:absolute sm:inset-0 sm:flex-row">
        {places.map((item) => {
          const open = place === item.id
          const quiet = place !== null && !open
          return (
            <button
              key={item.id}
              type="button"
              id={`lugar-${item.id}`}
              aria-pressed={open}
              aria-label={item.alt}
              onClick={() => choose(item.id)}
              className={cn(
                "relative overflow-hidden outline-none transition-[flex-grow,width,height] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-cream motion-reduce:transition-none",
                place === null && "aspect-[16/9] w-full sm:aspect-auto sm:h-full sm:w-auto sm:min-w-0 sm:flex-1",
                open && "aspect-[16/9] w-full sm:aspect-auto sm:h-full sm:w-auto sm:min-w-0 sm:flex-1",
                quiet && "h-14 w-full sm:h-full sm:w-16 sm:flex-none",
              )}
            >
              <Image
                src={item.image}
                alt=""
                fill
                placeholder="blur"
                sizes="(max-width: 640px) 100vw, 80vw"
                className={cn(
                  "object-cover object-center transition-[filter,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transform-none motion-reduce:blur-none motion-reduce:transition-none",
                  open ? "scale-100 blur-none" : quiet ? "scale-125 blur-xl" : "scale-110 blur-sm",
                )}
              />
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute inset-0 bg-olive transition-opacity duration-500 motion-reduce:transition-none",
                  open ? "opacity-0" : quiet ? "opacity-70" : "opacity-40",
                )}
              />
              {open ? (
                <>
                  <span aria-hidden className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-cream/90 px-3 py-2 font-label text-[0.6875rem] font-semibold tracking-[0.16em] text-olive uppercase sm:hidden">
                    {item.label}
                  </span>
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 hidden flex-col items-start gap-2 bg-olive px-6 py-5 sm:flex">
                    <span className="h-1 w-12 bg-terracotta" />
                    <span className="font-heading text-5xl leading-none font-extrabold tracking-[-0.04em] text-cream">
                      {item.label}
                    </span>
                  </span>
                </>
              ) : (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className={cn("flex items-center justify-center", quiet ? "flex-row gap-2 sm:flex-col" : "flex-col gap-2")}>
                    <span className="relative flex size-11 items-center justify-center">
                      <span className="place-tap-ring absolute inset-0 rounded-full bg-cream/50" />
                      <span className="relative flex size-11 items-center justify-center rounded-full bg-cream text-olive shadow-lift">
                        <MousePointerClick className="place-tap-icon size-5" aria-hidden />
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        "font-label text-[0.6875rem] font-semibold tracking-[0.16em] uppercase",
                        quiet
                          ? "text-cream sm:[writing-mode:vertical-rl]"
                          : "rounded-full bg-cream/90 px-3 py-2 text-olive",
                      )}
                    >
                      {item.label}
                    </span>
                  </span>
                </span>
              )}
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute top-0 bottom-0 w-1 bg-terracotta transition-opacity duration-500",
                  item.id === "terraza" ? "right-0" : "left-0",
                  open ? "opacity-100" : "opacity-0",
                )}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { PlaceSwitcher }
