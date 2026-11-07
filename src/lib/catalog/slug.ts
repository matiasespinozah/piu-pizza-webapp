/** Identificador estable a partir del nombre de la categoría, sin inventar otro título. */
function catalogSlug(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export { catalogSlug }
