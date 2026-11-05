"use client"

import { ProductImage } from "@/components/features/menu/product-image"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { formatCLP } from "@/components/ui/price"
import type { Product } from "@/lib/catalog/types"

type ProductDetailDialogProps = {
  product: Product | null
  onClose: () => void
}

/** Ficha ampliada de un producto: imagen grande, nombre, precio y descripción completa. */
function ProductDetailDialog({ product, onClose }: ProductDetailDialogProps) {
  return (
    <Dialog open={product !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto overflow-x-hidden p-0 sm:max-w-lg"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {product ? (
          <>
            <ProductImage
              src={product.imageUrl}
              name={product.name}
              ratio="4/3"
              sizes="(max-width: 640px) 100vw, 512px"
              priority
              className="w-full rounded-none rounded-t-2xl"
            />

            <div className="px-5 pt-5 pb-6 sm:px-7 sm:pt-6 sm:pb-8">
              <DialogTitle className="text-[clamp(1.75rem,7vw,2.25rem)] leading-[1.05] font-extrabold tracking-[-0.02em] text-olive">
                {product.name}
              </DialogTitle>
              <p className="mt-3 font-label text-2xl font-bold tracking-[0.02em] text-terracotta tabular-nums">
                {formatCLP(product.priceClp)}
              </p>
              <div aria-hidden className="my-5 h-0 border-t-2 border-dotted border-olive-soft" />
              <DialogDescription className="text-base leading-[1.6] text-olive-strong">
                {product.description}
              </DialogDescription>
              {product.availability !== "available" ? (
                <p className="mt-4 font-label text-[0.6875rem] font-semibold tracking-[0.16em] text-olive-muted uppercase">
                  No disponible por ahora
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export { ProductDetailDialog }
