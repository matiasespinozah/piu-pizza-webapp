/**
 * Caché de la carta pública en Next.js 16.4.4, sin un almacén compartido.
 *
 * Medido en esta versión:
 * - `expire` menor a 300 s deja el dato fuera del prerender. Cada instancia
 *   lo resolvería por su cuenta.
 * - Con `expire` de al menos 300 s y `stale` de al menos 300 s, el dato puede
 *   entrar en la página estática. El CDN recibe `s-maxage` = `revalidate` y
 *   `stale-while-revalidate` = `expire - revalidate` (1 s con estos números).
 * - El handler en memoria, en producción, descarta la entrada al cumplir
 *   `revalidate`. La siguiente visita a esa instancia vuelve a leer Firestore.
 * - `revalidateTag` no purga Cloud CDN ni las otras instancias.
 * - `revalidateTag(tag, { expire: 0 })` hace que la instancia que guardó
 *   descarte su copia. La visita siguiente, si llega a esa instancia y no a
 *   una copia del CDN, espera el documento nuevo.
 * - El navegador puede reutilizar una navegación interna durante `stale`
 *   (mínimo 30 s). Recargar pide de nuevo.
 *
 * Efecto para quien visita: hasta 5 minutos en otra instancia o en el CDN,
 * más 1 segundo de stale-while-revalidate. No es un plazo de 60 segundos.
 * Cada regeneración lee un documento, no los 131 productos.
 */
const catalogCacheLife = {
  stale: 300,
  revalidate: 300,
  expire: 301,
} as const

export { catalogCacheLife }
