/** Identificador estable a partir del nombre de la categoría, sin inventar otro título. */
function catalogSlug(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

const duplicateCategoryMessage = "Ya hay una categoría con ese nombre. Elige otro."

type NewCategoryId =
  | { ok: true; id: string }
  | { ok: false; status: 400 | 409; message: string }

/** Una categoría nueva no puede ocupar el identificador de una que ya existe. */
function newCategoryId(name: string, existingIds: readonly string[]): NewCategoryId {
  const id = catalogSlug(name)
  if (!id) return { ok: false, status: 400, message: "La categoría necesita un nombre." }
  if (existingIds.includes(id)) return { ok: false, status: 409, message: duplicateCategoryMessage }
  return { ok: true, id }
}

export { catalogSlug, newCategoryId }
