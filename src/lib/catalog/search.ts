import type { Product } from "@/lib/catalog/types"

/** Minúsculas y sin acentos, para comparar «champinones» con «champiñones». */
function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
}

/** Todas las palabras de la búsqueda deben aparecer en el nombre o la descripción. */
function searchProducts(products: readonly Product[], query: string) {
  const terms = normalizeText(query).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return []

  return products.filter((product) => {
    const haystack = normalizeText(`${product.name} ${product.description}`)
    return terms.every((term) => haystack.includes(term))
  })
}

export { normalizeText, searchProducts }
