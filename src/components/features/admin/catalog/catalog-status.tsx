import { Badge } from "@/components/ui/badge"
import type { AdminProduct } from "@/lib/catalog/types"

function ProductFlags({ product }: { product: Pick<AdminProduct, "availability" | "isVisible" | "isFeatured"> }) {
  return (
    <span className="flex flex-wrap gap-1">
      <Badge variant={product.availability === "available" ? "soft" : "outline"}>
        {product.availability === "available" ? "Disponible" : "Agotado"}
      </Badge>
      {product.isVisible ? null : <Badge variant="solid">Oculto</Badge>}
      {product.isFeatured ? <Badge variant="outline">Chef</Badge> : null}
    </span>
  )
}

function CategoryFlag({ isVisible }: { isVisible: boolean }) {
  return <Badge variant={isVisible ? "soft" : "solid"}>{isVisible ? "Visible" : "Oculta"}</Badge>
}

export { CategoryFlag, ProductFlags }
