/** Foto servida por Firebase Storage. Cualquier otro origen sigue usando la ilustración. */
function isCatalogPhotoUrl(value: string) {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }

  const hosted = url.protocol === "https:" && url.hostname === "firebasestorage.googleapis.com"
  const emulator =
    url.protocol === "http:" &&
    (url.hostname === "127.0.0.1" || url.hostname === "localhost") &&
    url.port === "9199"
  if (!hosted && !emulator) return false

  const path = decodeURIComponent(url.pathname)
  return path.includes("/products/")
}

/** Archivos de un producto que se pueden borrar. Si la foto a conservar no está en su carpeta, no se borra ninguna. */
function photosToDelete(names: readonly string[], productId: string, keep?: string) {
  if (!productId || productId.includes("/") || productId.includes("..")) return []
  const prefix = `products/${productId}/`
  if (keep && !keep.startsWith(prefix)) return []
  return names.filter((name) => name.startsWith(prefix) && name !== keep)
}

export { isCatalogPhotoUrl, photosToDelete }
