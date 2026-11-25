"use client"

import * as React from "react"
import Image, { getImageProps } from "next/image"
import { cn } from "cn"

import type { ImageVariants } from "@/lib/catalog/photos"
import {
  PRODUCT_PLACEHOLDER_SRC,
  isProductPlaceholderSrc,
  isUsableProductImageSrc,
  resolveProductImageSrc,
} from "@/lib/product-image"

const ratioClass = {
  "1/1": "aspect-square",
  "4/5": "aspect-[4/5]",
  "3/4": "aspect-[3/4]",
  "4/3": "aspect-[4/3]",
  "16/9": "aspect-video",
} as const

/**
 * Marca la foto como «loading» solo si todavía no llegó. Es el DOM, no el estado de React: no hay un segundo
 * render ni una diferencia con el HTML del servidor, y una foto que ya estaba lista no parpadea.
 * Los estilos están en `.photo-frame` y `img[data-photo]` (globals.css).
 */
function trackPhoto(img: HTMLImageElement | null) {
  if (img) img.dataset.photo = img.complete ? "ready" : "loading"
}

function photoArrived(event: React.SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.dataset.photo = "ready"
}

type ProductImageProps = {
  src?: string | null
  /** La misma foto en 360 y 900 px. Con ellas el navegador no baja la original en una miniatura. */
  variants?: ImageVariants | null
  name: string
  sizes?: string
  ratio?: keyof typeof ratioClass
  className?: string
  priority?: boolean
  /** Carga ya, sin esperar a que la foto esté cerca de la pantalla. Para las primeras filas de una lista. */
  eager?: boolean
  quality?: number
  /** Miniatura: la ilustración predeterminada usa menos margen interior. */
  compact?: boolean
}

/**
 * En producción `next/image` no optimiza (ver `.agents/rules/images-media.md`): entrega un solo archivo.
 * Aquí el navegador elige entre 360 px, 900 px y la foto principal según el ancho que ocupa y la densidad.
 */
function VariantPhoto({
  src,
  variants,
  alt,
  sizes,
  priority,
  eager,
  onError,
}: {
  src: string
  variants: ImageVariants
  alt: string
  sizes: string
  priority: boolean
  eager: boolean
  onError: () => void
}) {
  const { props } = getImageProps({
    src,
    alt,
    fill: true,
    sizes,
    priority,
    loading: eager && !priority ? "eager" : undefined,
    className: "object-cover object-center",
  })
  const srcSet = `${variants.thumb} 360w, ${variants.medium} 900w, ${src} 1600w`
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} alt={alt} srcSet={srcSet} sizes={sizes} ref={trackPhoto} onLoad={photoArrived} onError={onError} />
}

function ProductImage(props: ProductImageProps) {
  return <ProductImageFrame key={String(props.src ?? "")} {...props} />
}

function ProductImageFrame({
  src,
  variants,
  name,
  sizes = "(max-width: 640px) 100vw, 33vw",
  ratio = "1/1",
  className,
  priority = false,
  eager = false,
  quality = 80,
  compact = false,
}: ProductImageProps) {
  const resolved = resolveProductImageSrc(src)
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null)
  const [variantsFailed, setVariantsFailed] = React.useState(false)

  const primaryFailed = failedSrc === resolved
  const placeholderFailed = failedSrc === PRODUCT_PLACEHOLDER_SRC
  const showPlaceholder = !isUsableProductImageSrc(src) || primaryFailed || isProductPlaceholderSrc(resolved)
  const showEmpty = placeholderFailed
  const displaySrc = showPlaceholder ? PRODUCT_PLACEHOLDER_SRC : resolved
  const useVariants = !showPlaceholder && !variantsFailed && variants != null
  const alt = showPlaceholder ? `Ilustración de PIÙ para ${name}` : `Fotografía de ${name}`

  return (
    <div className={cn("photo-frame relative overflow-hidden rounded-xl", ratioClass[ratio], className)}>
      {showEmpty ? (
        <div className="size-full bg-cream" role="img" aria-label={alt} />
      ) : (
        <div className={cn("absolute inset-0", showPlaceholder && (compact ? "p-1.5" : "p-5 sm:p-6"))}>
          <div className="relative size-full">
            {useVariants ? (
              <VariantPhoto
                src={displaySrc}
                variants={variants}
                alt={alt}
                sizes={sizes}
                priority={priority}
                eager={eager}
                // Si una versión chica no carga, se vuelve a la foto principal antes de rendirse.
                onError={() => setVariantsFailed(true)}
              />
            ) : (
              <Image
                src={displaySrc}
                alt={alt}
                fill
                sizes={sizes}
                priority={priority}
                loading={eager && !priority ? "eager" : undefined}
                quality={quality}
                ref={trackPhoto}
                onLoad={photoArrived}
                className={showPlaceholder ? "object-contain object-center mix-blend-multiply" : "object-cover object-center"}
                onError={() => setFailedSrc(displaySrc)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export { ProductImage }
export type { ProductImageProps }
