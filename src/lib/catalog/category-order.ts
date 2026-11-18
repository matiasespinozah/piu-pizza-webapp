type OrderedCategory = { id: string; sortOrder: number }

type CategoryMove = { id: string; sortOrder: number }

/** Mueve un id a la posición calculada sin contar la fila que se está arrastrando. */
function moveCategoryId(ids: readonly string[], dragId: string, to: number) {
  const from = ids.indexOf(dragId)
  if (from < 0) return [...ids]
  const next = [...ids]
  next.splice(from, 1)
  const index = Math.max(0, Math.min(to, next.length))
  next.splice(index, 0, dragId)
  return next
}

function dropIndex(pointerY: number, rows: readonly { id: string; top: number; height: number }[], dragId: string) {
  const others = rows.filter((row) => row.id !== dragId)
  for (let index = 0; index < others.length; index += 1) {
    const row = others[index]
    if (pointerY < row.top + row.height / 2) return index
  }
  return others.length
}

/**
 * Reparte los números de orden que ya tenían las categorías visibles.
 * Si hay números repetidos, usa 1, 2, 3… para que el arrastre no se deshaga por el nombre.
 */
function movesForCategoryOrder(current: readonly OrderedCategory[], nextIds: readonly string[]): CategoryMove[] | null {
  if (current.length !== nextIds.length) return null
  if (new Set(nextIds).size !== nextIds.length) return null
  const known = new Map(current.map((item) => [item.id, item.sortOrder]))
  if (nextIds.some((id) => !known.has(id))) return null
  const slots = current.map((item) => item.sortOrder).toSorted((left, right) => left - right)
  const unique = slots.every((value, index) => index === 0 || value > slots[index - 1])
  const assigned =
    unique && slots.length > 0 && slots[0] >= 0 && slots[slots.length - 1] <= 999
      ? slots
      : nextIds.map((_, index) => index + 1)
  return nextIds.flatMap((id, index) => {
    const sortOrder = assigned[index]
    return known.get(id) === sortOrder ? [] : [{ id, sortOrder }]
  })
}

export { dropIndex, moveCategoryId, movesForCategoryOrder }
export type { CategoryMove }
