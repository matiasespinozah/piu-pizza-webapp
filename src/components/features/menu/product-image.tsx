"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "cn"

import {
  PRODUCT_PLACEHOLDER_SRC,
  isProductPlaceholderSrc,
  isUsableProductImageSrc,
  resolveProductImageSrc,
} from "@/lib/product-image"

const ratioClass = {
  "1/1": "aspect-square",
  "4/5": "aspect-[4/5]",
  "4/3": "aspect-[4/3]",
  "3/4": "aspect-[3/4]",
  "16/9": "aspect-video",
} as const

type ProductImageProps = {
  src?: string | null
  name: string
  sizes?: string
  ratio?: keyof typeof ratioClass
  className?: string
  priority?: boolean
}

function ProductImage(props: ProductImageProps) {
  return <ProductImageFrame key={String(props.src ?? "")} {...props} />
}

function ProductImageFrame({
  src,
  name,
  sizes = "(max-width: 640px) 100vw, 33vw",
  ratio = "1/1",
  className,
  priority = false,
}: ProductImageProps) {
  const resolved = resolveProductImageSrc(src)
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null)

  const primaryFailed = failedSrc === resolved
  const placeholderFailed = failedSrc === PRODUCT_PLACEHOLDER_SRC
  const showPlaceholder = !isUsableProductImageSrc(src) || primaryFailed || isProductPlaceholderSrc(resolved)
  const showEmpty = placeholderFailed
  const displaySrc = showPlaceholder ? PRODUCT_PLACEHOLDER_SRC : resolved
  const alt = showPlaceholder ? `Ilustración de PIÙ para ${name}` : `Fotografía de ${name}`

  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-cream", ratioClass[ratio], className)}>
      {showEmpty ? (
        <div className="size-full bg-cream" role="img" aria-label={alt} />
      ) : (
        <div className={cn("absolute inset-0", showPlaceholder && "p-5 sm:p-6")}>
          <div className="relative size-full">
            <Image
              src={displaySrc}
              alt={alt}
              fill
              sizes={sizes}
              priority={priority}
              className={showPlaceholder ? "object-contain object-center mix-blend-multiply" : "object-cover object-center"}
              onError={() => setFailedSrc(displaySrc)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export { ProductImage }
export type { ProductImageProps }
