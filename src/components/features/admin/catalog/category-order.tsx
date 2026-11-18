"use client"

import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Heading, Text } from "@/components/ui/typography"
import type { AdminCategory } from "@/lib/catalog/types"

type CategoryOrderProps = {
  categories: AdminCategory[]
  counts: Map<string, number>
  busyId: string | null
  locked: boolean
  onMove: (category: AdminCategory, direction: -1 | 1) => void
}

function CategoryOrder({ categories, counts, busyId, locked, onMove }: CategoryOrderProps) {
  const visible = categories.filter((category) => category.isVisible)
  const hidden = categories.filter((category) => !category.isVisible)

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3" aria-labelledby="catalog-public-order">
        <Heading as="h2" size="h4" id="catalog-public-order">
          Así se ve en la carta
        </Heading>
        {visible.length === 0 ? (
          <Text tone="muted">Ninguna categoría está visible. El cliente no ve secciones hasta que publiques una.</Text>
        ) : (
          <ol className="flex gap-2 overflow-x-auto pb-1" aria-label="Orden actual en la carta del cliente">
            {visible.map((category, index) => (
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
          <Text tone="muted">Sube o baja una categoría. La de arriba queda primera en la carta del cliente.</Text>
        </div>
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-olive-soft px-4 py-10 text-center">
            <Text>No hay categorías visibles para ordenar.</Text>
          </div>
        ) : (
          <ol className="flex flex-col gap-2">
            {visible.map((category, index) => {
              const count = counts.get(category.id) ?? 0
              const busy = busyId === category.id
              return (
                <li
                  key={category.id}
                  aria-busy={busy}
                  className="flex min-w-0 items-center gap-2 rounded-2xl border border-olive-line bg-surface-raised p-2"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-cream font-heading text-lg font-extrabold text-olive">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-heading text-lg leading-tight font-bold">{category.name}</span>
                    <span className="font-label text-sm text-olive-muted">
                      {count} {count === 1 ? "producto" : "productos"}
                    </span>
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      disabled={locked || index === 0}
                      aria-label={`Subir ${category.name}`}
                      onClick={() => onMove(category, -1)}
                    >
                      <ChevronUpIcon aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      disabled={locked || index === visible.length - 1}
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
