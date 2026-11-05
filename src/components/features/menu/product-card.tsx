import { ProductImage } from "@/components/features/menu/product-image"
import { formatCLP } from "@/components/ui/price"
import type { Product } from "@/lib/catalog/types"

/**
 * Fila editorial de carta. Estructura fija en tres columnas: miniatura | nombre | precio.
 * El precio siempre queda alineado arriba a la derecha, sin importar cuánto mida el nombre,
 * y la descripción usa todo el ancho disponible bajo el nombre y el precio.
 */
function ProductCard({ product }: { product: Product }) {
  return (
    <article className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 py-5 sm:gap-x-5 sm:py-6">
      <ProductImage
        compact
        src={product.imageUrl}
        name={product.name}
        sizes="96px"
        className="row-span-2 size-14 self-start sm:size-24"
      />

      <div className="flex min-w-0 items-baseline gap-3 self-start">
        <h3 className="min-w-0 font-heading text-[1.25rem] leading-[1.2] font-extrabold tracking-[-0.015em] text-olive sm:text-[1.4rem]">
          {product.name}
        </h3>
        <span aria-hidden className="mb-1 hidden h-0 min-w-4 flex-1 border-t-2 border-dotted border-olive-soft sm:block" />
      </div>

      <p className="self-start text-right font-label text-lg leading-[1.45] font-bold tracking-[0.02em] whitespace-nowrap text-terracotta tabular-nums">
        {formatCLP(product.priceClp)}
      </p>

      <div className="col-span-2 mt-2 min-w-0">
        <p className="text-[0.9375rem] leading-[1.5] text-olive-strong">{product.description}</p>

        {product.availability !== "available" ? (
          <p className="mt-2 font-label text-[0.6875rem] font-semibold tracking-[0.16em] text-olive-muted uppercase">
            No disponible por ahora
          </p>
        ) : null}
      </div>
    </article>
  )
}

export { ProductCard }
