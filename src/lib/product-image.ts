/** Ilustración oficial cuando un producto no tiene fotografía. */
const PRODUCT_PLACEHOLDER_SRC = "/not_image.png"

function isRemoteProductImageSrc(value: string) {
  return value.startsWith("//") || /^https?:\/\//i.test(value)
}

/**
 * Acepta solo rutas locales (`/…`). Las URL remotas se rechazan hasta
 * declarar orígenes en `images.remotePatterns` de Next.
 */
function isUsableProductImageSrc(src: string | null | undefined): src is string {
  if (typeof src !== "string") return false
  const value = src.trim()
  if (!value) return false
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
