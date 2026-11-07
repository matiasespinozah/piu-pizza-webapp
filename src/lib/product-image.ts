import { isCatalogPhotoUrl } from "@/lib/catalog/photos"

/** Ilustración oficial cuando un producto no tiene fotografía. */
const PRODUCT_PLACEHOLDER_SRC = "/not_image.png"

function isRemoteProductImageSrc(value: string) {
  return value.startsWith("//") || /^https?:\/\//i.test(value)
}

/**
 * Acepta una ruta local (`/…`) o una foto ya subida a Storage.
 * El resto usa la ilustración. No se inventan fotografías.
 */
function isUsableProductImageSrc(src: string | null | undefined): src is string {
  if (typeof src !== "string") return false
  const value = src.trim()
  if (!value) return false
  if (isCatalogPhotoUrl(value)) return true
  if (isRemoteProductImageSrc(value)) return false
  return value.startsWith("/")
}

function resolveProductImageSrc(src: string | null | undefined) {
  if (!isUsableProductImageSrc(src)) return PRODUCT_PLACEHOLDER_SRC
  return src.trim()
}

function isProductPlaceholderSrc(src: string) {
  return src.trim() === PRODUCT_PLACEHOLDER_SRC
}

export {
  PRODUCT_PLACEHOLDER_SRC,
  isProductPlaceholderSrc,
  isUsableProductImageSrc,
  resolveProductImageSrc,
}
