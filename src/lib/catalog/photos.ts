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

/** Versiones más chicas de la misma foto: `thumb` (360 px, para listas) y `medium` (900 px). */
type ImageVariants = { thumb: string; medium: string }

/**
 * Lee las variantes guardadas en un producto. Si falta alguna, o no es una foto de Storage,
 * devuelve null y el sitio usa solo la foto principal. Nunca lanza: un dato malo no debe
 * impedir que el producto se publique.
 */
function readImageVariants(value: unknown): ImageVariants | null {
  if (typeof value !== "object" || value === null) return null
  const { thumb, medium } = value as Record<string, unknown>
  if (typeof thumb !== "string" || typeof medium !== "string") return null
  return isCatalogPhotoUrl(thumb) && isCatalogPhotoUrl(medium) ? { thumb, medium } : null
}

/**
 * Archivos de un producto que se pueden borrar. `keep` son los que siguen en uso (la foto y sus variantes).
 * Si alguno no está en la carpeta del producto, no se borra ninguno.
 */
function photosToDelete(names: readonly string[], productId: string, keep?: string | readonly string[]) {
  if (!productId || productId.includes("/") || productId.includes("..")) return []
  const prefix = `products/${productId}/`
  const kept = new Set(typeof keep === "string" ? [keep] : (keep ?? []))
  if ([...kept].some((name) => !name.startsWith(prefix))) return []
  return names.filter((name) => name.startsWith(prefix) && !kept.has(name))
}

export { isCatalogPhotoUrl, photosToDelete, readImageVariants }
export type { ImageVariants }
