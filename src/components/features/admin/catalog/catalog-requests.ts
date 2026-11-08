import { adminRequestHeader, adminRequestValue } from "@/lib/auth/session-policy"
import type { AdminCategory, AdminProduct } from "@/lib/catalog/types"

type CatalogResult = { ok: true; id?: string; imageUrl?: string } | { ok: false; message: string }

type ProductInput = {
  id?: string
  categoryId: string
  name: string
  description: string
  priceClp: number
  availability: AdminProduct["availability"]
  isVisible: boolean
  isFeatured: boolean
  sortOrder: number
}

type CategoryInput = {
  id?: string
  name: string
  description: string | null
  sortOrder: number
  isVisible: boolean
}

async function postCatalog(body: unknown): Promise<CatalogResult> {
  try {
    const response = await fetch("/api/admin/catalog", {
      method: "POST",
      headers: { "content-type": "application/json", [adminRequestHeader]: adminRequestValue },
      body: JSON.stringify(body),
    })
    const payload = (await response.json().catch(() => null)) as { message?: string; id?: string } | null
    if (!response.ok) return { ok: false, message: payload?.message || "No se pudo guardar." }
    return { ok: true, id: payload?.id }
  } catch {
    return { ok: false, message: "No se pudo guardar. Revisa la conexión." }
  }
}

async function postCatalogPhoto(productId: string, file: File): Promise<CatalogResult> {
  const body = new FormData()
  body.set("productId", productId)
  body.set("file", file)
  try {
    const response = await fetch("/api/admin/catalog/image", {
      method: "POST",
      headers: { [adminRequestHeader]: adminRequestValue },
      body,
    })
    const payload = (await response.json().catch(() => null)) as { message?: string; imageUrl?: string } | null
    if (!response.ok) return { ok: false, message: payload?.message || "No se pudo guardar la foto." }
    return { ok: true, imageUrl: payload?.imageUrl }
  } catch {
    return { ok: false, message: "No se pudo guardar la foto. Revisa la conexión." }
  }
}

function productInput(product: AdminProduct, patch: Partial<ProductInput> = {}): ProductInput {
  return {
    id: product.id,
    categoryId: product.categoryId,
    name: product.name,
    description: product.description,
    priceClp: product.priceClp,
    availability: product.availability,
    isVisible: product.isVisible,
    isFeatured: product.isFeatured,
    sortOrder: product.sortOrder,
    ...patch,
  }
}

function categoryInput(category: AdminCategory, patch: Partial<CategoryInput> = {}): CategoryInput {
  return {
    id: category.id,
    name: category.name,
    description: category.description,
    sortOrder: category.sortOrder,
    isVisible: category.isVisible,
    ...patch,
  }
}

export { categoryInput, postCatalog, postCatalogPhoto, productInput }
export type { CategoryInput, ProductInput }
