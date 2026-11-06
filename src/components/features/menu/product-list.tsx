"use client"

import * as React from "react"

import { ProductCard } from "@/components/features/menu/product-card"
import { ProductDetailDialog } from "@/components/features/menu/product-detail-dialog"
import type { Product } from "@/lib/catalog/types"

function ProductList({ products }: { products: readonly Product[] }) {
  const [selected, setSelected] = React.useState<Product | null>(null)

  return (
    <>
      <ul className="border-t border-olive lg:grid lg:grid-cols-2 lg:gap-x-16">
        {products.map((product, index) => (
          <li
            key={product.id}
            className="hero-rise border-b border-olive-line"
            style={{ animationDelay: `${Math.min(index, 6) * 70}ms` }}
          >
            <button
              type="button"
              onClick={() => setSelected(product)}
              aria-haspopup="dialog"
              aria-label={`Ver detalle de ${product.name}`}
              className="block w-full cursor-pointer text-left outline-none transition-colors hover:bg-olive-wash/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-olive"
            >
              <ProductCard product={product} />
            </button>
          </li>
        ))}
      </ul>
      <ProductDetailDialog product={selected} onClose={() => setSelected(null)} />
    </>
  )
}

export { ProductList }
