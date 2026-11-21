"use client"

import { useEffect, useRef, useState, type PointerEvent } from "react"
import { ChevronDownIcon, ChevronUpIcon, GripVerticalIcon } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Heading, Text } from "@/components/ui/typography"
import { dropIndex, moveCategoryId } from "@/lib/catalog/category-order"
import type { AdminCategory } from "@/lib/catalog/types"

type CategoryOrderProps = {
  categories: AdminCategory[]
  counts: Map<string, number>
  busyId: string | null
  locked: boolean
  onEdit: (category: AdminCategory) => void
  onMove: (category: AdminCategory, direction: -1 | 1) => void
  onReorder: (categories: AdminCategory[]) => Promise<boolean>
}

function CategoryOrder({ categories, counts, busyId, locked, onEdit, onMove, onReorder }: CategoryOrderProps) {
  const visible = categories.filter((category) => category.isVisible)
  const hidden = categories.filter((category) => !category.isVisible)
  const listRef = useRef<HTMLOListElement>(null)
  const orderRef = useRef<string[]>(visible.map((category) => category.id))
  const dragRef = useRef<{ id: string; pointerId: number; startY: number; moved: boolean; lastY: number } | null>(null)
  const frameRef = useRef(0)
  const stopDragRef = useRef<(() => void) | null>(null)
  const propIds = visible.map((category) => category.id).join("\0")
  const [trackedIds, setTrackedIds] = useState(propIds)
  const [order, setOrder] = useState<string[] | null>(null)
  if (trackedIds !== propIds) {
    setTrackedIds(propIds)
    setOrder(null)
    orderRef.current = propIds.length === 0 ? [] : propIds.split("\0")
  }
  const [dragId, setDragId] = useState<string | null>(null)
  const shown = (order ?? visible.map((category) => category.id))
    .map((id) => visible.find((category) => category.id === id))
    .filter((category): category is AdminCategory => category !== undefined)

  useEffect(() => {
    return () => {
      cancelAnimationFrame(frameRef.current)
      stopDragRef.current?.()
    }
  }, [])

  function scrollWhileDragging() {
    const current = dragRef.current
    if (!current?.moved) return
    const edge = 88
    const y = current.lastY
    if (y < edge) window.scrollBy(0, -Math.ceil((edge - y) / 3))
    else if (y > window.innerHeight - edge) window.scrollBy(0, Math.ceil((y - (window.innerHeight - edge)) / 3))
    placeAt(y)
    frameRef.current = requestAnimationFrame(scrollWhileDragging)
  }

  function placeAt(clientY: number) {
    const current = dragRef.current
    const list = listRef.current
    if (!current || !list) return
    const rows = [...list.querySelectorAll<HTMLElement>("[data-category-id]")].map((row) => {
      const rect = row.getBoundingClientRect()
      return { id: row.dataset.categoryId ?? "", top: rect.top, height: rect.height }
    })
    const next = moveCategoryId(orderRef.current, current.id, dropIndex(clientY, rows, current.id))
    if (next.join() === orderRef.current.join()) return
    orderRef.current = next
    setOrder(next)
  }

  function finishDrag() {
    cancelAnimationFrame(frameRef.current)
    const current = dragRef.current
    dragRef.current = null
    setDragId(null)
    if (!current?.moved) return
    const next = orderRef.current
      .map((id) => visible.find((category) => category.id === id))
      .filter((category): category is AdminCategory => category !== undefined)
    const changed = next.some((category, index) => category.id !== visible[index]?.id)
    if (!changed) return
    void onReorder(next).then((saved) => {
      if (!saved) setOrder(null)
    })
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>, category: AdminCategory) {
    if (locked || event.button !== 0) return
    event.preventDefault()
    stopDragRef.current?.()
    const pointerId = event.pointerId
    dragRef.current = { id: category.id, pointerId, startY: event.clientY, moved: false, lastY: event.clientY }

    function dragMove(move: globalThis.PointerEvent) {
      const current = dragRef.current
      if (!current || move.pointerId !== current.pointerId) return
      current.lastY = move.clientY
      if (!current.moved && Math.abs(move.clientY - current.startY) < 8) return
      if (!current.moved) {
        current.moved = true
        setDragId(current.id)
        frameRef.current = requestAnimationFrame(scrollWhileDragging)
      }
      move.preventDefault()
      placeAt(move.clientY)
    }

    function endDrag(end: globalThis.PointerEvent) {
      if (end.pointerId !== pointerId) return
      stop()
      finishDrag()
    }

    function stop() {
      window.removeEventListener("pointermove", dragMove)
      window.removeEventListener("pointerup", endDrag)
      window.removeEventListener("pointercancel", endDrag)
      if (stopDragRef.current === stop) stopDragRef.current = null
    }

    stopDragRef.current = stop
    window.addEventListener("pointermove", dragMove, { passive: false })
    window.addEventListener("pointerup", endDrag)
    window.addEventListener("pointercancel", endDrag)
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3" aria-labelledby="catalog-public-order">
        <Heading as="h2" size="h4" id="catalog-public-order">
          Así se ve en la carta
        </Heading>
        {shown.length === 0 ? (
          <Text tone="muted">Ninguna categoría está visible. El cliente no ve secciones hasta que publiques una.</Text>
        ) : (
          <ol className="flex gap-2 overflow-x-auto pb-1" aria-label="Orden actual en la carta del cliente">
            {shown.map((category, index) => (
              <li
                key={category.id}
                className="flex h-11 shrink-0 items-center rounded-4xl bg-primary px-4 text-sm font-semibold whitespace-nowrap text-primary-foreground"
              >
                {index + 1}. {category.name}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="catalog-reorder">
        <div className="flex flex-col gap-1">
          <Heading as="h2" size="h4" id="catalog-reorder">
            Ordenar y reubicar
          </Heading>
          <Text tone="muted">Toma el punto y arrastra. También puedes subir o bajar. Arriba queda primera en la carta.</Text>
        </div>
        {shown.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-olive-soft px-4 py-10 text-center">
            <Text>No hay categorías visibles para ordenar.</Text>
          </div>
        ) : (
          <ol ref={listRef} className="flex flex-col gap-2" aria-label="Orden de las categorías">
            {shown.map((category, index) => {
              const count = counts.get(category.id) ?? 0
              const busy = busyId === category.id
              const dragging = dragId === category.id
              return (
                <li
                  key={category.id}
                  data-category-id={category.id}
                  aria-busy={busy}
                  className={cn(
                    "flex min-w-0 items-center gap-2 rounded-2xl border border-olive-line bg-surface-raised p-2",
                    dragging && "relative z-10 scale-[1.02] border-olive shadow-lift",
                  )}
                >
                  <button
                    type="button"
                    className="flex size-11 shrink-0 touch-none items-center justify-center rounded-xl bg-cream text-olive outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-45"
                    aria-label={`Arrastrar ${category.name}`}
                    disabled={locked}
                    onPointerDown={(event) => startDrag(event, category)}
                  >
                    <GripVerticalIcon aria-hidden className="size-5" />
                  </button>
                  <span className="flex size-8 shrink-0 items-center justify-center font-heading text-lg font-extrabold text-olive tabular-nums">
                    {index + 1}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col items-start">
                    <span className="block w-full truncate font-heading text-lg leading-tight font-bold">{category.name}</span>
                    <span className="font-label text-sm text-olive-muted">
                      {count} {count === 1 ? "producto" : "productos"}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-11 px-2"
                      disabled={locked}
                      onClick={() => onEdit(category)}
                    >
                      Editar
                    </Button>
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      disabled={locked || dragId !== null || index === 0}
                      aria-label={`Subir ${category.name}`}
                      onClick={() => onMove(category, -1)}
                    >
                      <ChevronUpIcon aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      disabled={locked || dragId !== null || index === shown.length - 1}
                      aria-label={`Bajar ${category.name}`}
                      onClick={() => onMove(category, 1)}
                    >
                      <ChevronDownIcon aria-hidden />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      {hidden.length > 0 ? (
        <section className="flex flex-col gap-2" aria-labelledby="catalog-hidden-categories">
          <Heading as="h2" size="h4" id="catalog-hidden-categories">
            No se muestran
          </Heading>
          <Text size="sm" tone="muted">
            Están ocultas, así que no entran en el orden de la carta.
          </Text>
          <ul className="flex flex-col gap-2">
            {hidden.map((category) => (
              <li key={category.id} className="rounded-2xl border border-dashed border-olive-soft px-4 py-3">
                <span className="block truncate font-heading font-bold">{category.name}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

export { CategoryOrder }
