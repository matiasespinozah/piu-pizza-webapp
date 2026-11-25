"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "cn"

type MapEmbedProps = {
  src: string
  title: string
  className?: string
}

/**
 * El mapa de Google descarga unos 500 KB de scripts. `loading="lazy"` no basta: en conexiones
 * lentas Chrome adelanta mucho la carga y compite con la foto principal. El iframe nace
 * cuando el recuadro está a menos de 300 px de la pantalla.
 */
function MapEmbed({ src, title, className }: MapEmbedProps) {
  const box = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)

  useEffect(() => {
    const element = box.current
    if (!element) return
    if (typeof IntersectionObserver === "undefined") {
      const timer = window.setTimeout(() => setNear(true), 0)
      return () => window.clearTimeout(timer)
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true)
          observer.disconnect()
        }
      },
      { rootMargin: "300px" }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={box}
      className={cn(
        "relative h-[16rem] overflow-hidden rounded-2xl bg-olive-wash sm:h-[20rem] lg:h-[24rem]",
        className
      )}
    >
      {near ? (
        <iframe
          src={src}
          title={title}
          referrerPolicy="no-referrer-when-downgrade"
          className="pointer-events-none absolute inset-0 size-full border-0"
        />
      ) : null}
    </div>
  )
}

export { MapEmbed }
