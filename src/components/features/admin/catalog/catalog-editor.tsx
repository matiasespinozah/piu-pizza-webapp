"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeftIcon,
  BanIcon,
  ChevronRightIcon,
  EllipsisIcon,
  EyeOffIcon,
  ImageOffIcon,
  LayoutGridIcon,
  PencilIcon,
  PizzaIcon,
  PlusIcon,
  Trash2Icon,
  SearchIcon,
  type LucideIcon,
} from "lucide-react"
import { cn } from "cn"

import { ProductImage } from "@/components/features/menu/product-image"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { formatCLP } from "@/components/ui/price"
import { Heading, Text } from "@/components/ui/typography"
import { movesForCategoryOrder } from "@/lib/catalog/category-order"
import type { AdminCategory, AdminProduct } from "@/lib/catalog/types"

import "../admin-shell.css"
import { CategoryEditor } from "./category-editor"
import { CategoryOrder } from "./category-order"
import { postCatalog, productInput } from "./catalog-requests"
import { ConfirmDeleteDialog } from "./catalog-confirm"
import { CategoryFlag, ProductFlags } from "./catalog-status"
import { ProductEditor } from "./product-editor"

type View = "home" | "products" | "categories" | "settings"
type Shortcut = "none" | "soldOut" | "hidden" | "noPhoto"
type ProductSession = { key: string; product: AdminProduct | null }
type CategorySession = { key: string; category: AdminCategory | null }

const shortcutLabel: Record<Shortcut, string> = {
  none: "Todos los productos",
  soldOut: "Agotados",
  hidden: "Ocultos",
  noPhoto: "Sin fotografía",
}

function CatalogEditor({ categories, products }: { categories: AdminCategory[]; products: AdminProduct[] }) {
  const router = useRouter()
  const pendingScroll = useRef<number | null>(null)
  const orderLock = useRef(false)
  const [view, setView] = useState<View>("products")
  const [query, setQuery] = useState("")
  const [categoryId, setCategoryId] = useState("all")
  const [shortcut, setShortcut] = useState<Shortcut>("none")
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [heldVisibility, setHeldVisibility] = useState<Record<string, boolean>>({})
  const heldTimers = useRef<Record<string, number>>({})
  const [productSession, setProductSession] = useState<ProductSession | null>(null)
  const [categorySession, setCategorySession] = useState<CategorySession | null>(null)
  const [priceTarget, setPriceTarget] = useState<AdminProduct | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<AdminCategory | null>(null)
  const [deleteError, setDeleteError] = useState("")

  useEffect(() => {
    const timers = heldTimers.current
    return () => {
      for (const timer of Object.values(timers)) window.clearTimeout(timer)
    }
  }, [])

  function productIsBusy(id: string) {
    return busyId === id || id in heldVisibility
  }

  const releasedVisibility = Object.keys(heldVisibility).filter((id) => {
    const visible = heldVisibility[id]
    return products.some((product) => product.id === id && product.isVisible === visible)
  })
  if (releasedVisibility.length > 0) {
    setHeldVisibility((current) => {
      const next = { ...current }
      let changed = false
      for (const id of releasedVisibility) {
        if (!(id in next)) continue
        delete next[id]
        changed = true
      }
      return changed ? next : current
    })
  }

  useEffect(() => {
    if (pendingScroll.current == null) return
    const top = pendingScroll.current
    pendingScroll.current = null
    requestAnimationFrame(() => window.scrollTo(0, top))
  }, [products, categories])

  const names = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories])
  const orderedCategories = useMemo(
    () => categories.toSorted((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "es")),
    [categories],
  )
  const counts = useMemo(() => {
    const byCategory = new Map<string, number>()
    for (const product of products) byCategory.set(product.categoryId, (byCategory.get(product.categoryId) ?? 0) + 1)
    return {
      byCategory,
      soldOut: products.filter((product) => product.availability === "unavailable").length,
      hidden: products.filter((product) => !product.isVisible).length,
      noPhoto: products.filter((product) => !product.imageUrl).length,
    }
  }, [products])

  const visibleProducts = useMemo(() => {
    const needle = fold(query.trim())
    return products
      .filter((product) => {
        if (categoryId !== "all" && product.categoryId !== categoryId) return false
        if (shortcut === "soldOut" && product.availability !== "unavailable") return false
        if (shortcut === "hidden" && product.isVisible) return false
        if (shortcut === "noPhoto" && product.imageUrl) return false
        if (!needle) return true
        return fold(product.name).includes(needle) || fold(names.get(product.categoryId) ?? "").includes(needle)
      })
      .toSorted((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "es"))
  }, [products, query, categoryId, shortcut, names])

  const canReorder = categoryId !== "all" && !query.trim() && shortcut === "none"
  const defaultCategoryId = categoryId !== "all" ? categoryId : (orderedCategories[0]?.id ?? "")
  const visibleCategories = orderedCategories.filter((category) => category.isVisible)
  const deleteCount = categoryToDelete ? (counts.byCategory.get(categoryToDelete.id) ?? 0) : 0
  function openProducts(next: { categoryId?: string; shortcut?: Shortcut } = {}) {
    setCategoryId(next.categoryId ?? "all")
    setShortcut(next.shortcut ?? "none")
    setQuery("")
    setView("products")
    window.scrollTo(0, 0)
  }

  function openView(next: View) {
    setView(next)
    window.scrollTo(0, 0)
  }

  function refresh(message: string) {
    pendingScroll.current = window.scrollY
    setStatus(message)
    setError("")
    router.refresh()
  }

  async function patchProduct(product: AdminProduct, patch: Parameters<typeof productInput>[1], message: string) {
    if (productIsBusy(product.id)) return false
    setBusyId(product.id)
    setError("")
    const result = await postCatalog({ action: "save-product", product: productInput(product, patch) })
    if (!result.ok) {
      setBusyId(null)
      setError(result.message)
      return false
    }
    if (typeof patch?.isVisible === "boolean") {
      const visible = patch.isVisible
      setHeldVisibility((current) => ({ ...current, [product.id]: visible }))
      const previous = heldTimers.current[product.id]
      if (previous) window.clearTimeout(previous)
      heldTimers.current[product.id] = window.setTimeout(() => {
        setHeldVisibility((current) => {
          if (!(product.id in current) || current[product.id] !== visible) return current
          const next = { ...current }
          delete next[product.id]
          return next
        })
      }, 12_000)
    }
    setBusyId(null)
    refresh(message)
    return true
  }

  function visibilityMessage(product: AdminProduct, nextVisible: boolean) {
    if (!nextVisible) return `${product.name} quedó oculto.`
    if (shortcut === "hidden") {
      return `${product.name} volvió a la carta y salió de Ocultos. Búscalo en Todos. En el sitio puede tardar unos minutos.`
    }
    return `${product.name} volvió a la carta. En el sitio puede tardar unos minutos.`
  }

  async function swapOrder(
    first: { id: string; save: () => Promise<{ ok: boolean; message?: string }> },
    second: () => Promise<{ ok: boolean; message?: string }>,
    message: string,
  ) {
    setBusyId(first.id)
    setError("")
    const one = await first.save()
    if (!one.ok) {
      setBusyId(null)
      setError(one.message ?? "No se pudo guardar.")
      return
    }
    const two = await second()
    setBusyId(null)
    if (!two.ok) {
      setError(two.message ?? "No se pudo guardar.")
      return
    }
    refresh(message)
  }

  function moveWithin(list: AdminCategory[], category: AdminCategory, direction: -1 | 1) {
    const index = list.findIndex((item) => item.id === category.id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= list.length) return
    const next = [...list]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    void reorderVisible(next)
  }

  async function reorderVisible(next: AdminCategory[]) {
    const moves = movesForCategoryOrder(visibleCategories, next.map((category) => category.id))
    if (!moves) return false
    if (moves.length === 0) return true
    if (orderLock.current) return false
    orderLock.current = true
    setBusyId(next[0]?.id ?? "order")
    setError("")
    try {
      const result = await postCatalog({ action: "reorder-categories", moves })
      if (!result.ok) {
        setError(result.message)
        return false
      }
      refresh("Orden de categorías guardado.")
      return true
    } finally {
      setBusyId(null)
      orderLock.current = false
    }
  }

  async function removeCategory() {
    if (!categoryToDelete) return
    setBusyId(categoryToDelete.id)
    setDeleteError("")
    const result = await postCatalog({ action: "delete-category", id: categoryToDelete.id })
    setBusyId(null)
    if (!result.ok) {
      setDeleteError(result.message)
      return
    }
    const name = categoryToDelete.name
    setCategoryToDelete(null)
    refresh(`${name} eliminada.`)
  }

  function moveProduct(product: AdminProduct, direction: -1 | 1) {
    const index = visibleProducts.findIndex((item) => item.id === product.id)
    const neighbor = visibleProducts[index + direction]
    if (!neighbor || neighbor.categoryId !== product.categoryId) return
    void swapOrder(
      {
        id: product.id,
        save: () => postCatalog({ action: "save-product", product: productInput(product, { sortOrder: neighbor.sortOrder }) }),
      },
      () => postCatalog({ action: "save-product", product: productInput(neighbor, { sortOrder: product.sortOrder }) }),
      "Orden guardado.",
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-4 lg:max-w-[76rem]">
      {view === "home" ? (
        <header className="flex flex-col gap-1">
          <Heading as="h1" size="h3">
            Carta
          </Heading>
          <Text tone="muted">Elige qué quieres revisar.</Text>
        </header>
      ) : (
        <header className="flex min-w-0 flex-col gap-3">
          {view === "categories" || view === "settings" ? (
            <Button type="button" variant="ghost" size="sm" className="-ml-3 self-start" onClick={() => openView("products")}>
              <ArrowLeftIcon aria-hidden />
              Carta
            </Button>
          ) : null}
          <div className="flex min-w-0 items-end justify-between gap-3">
            <div className="min-w-0">
              <Heading as="h1" size="h3">
                {view === "categories" ? "Categorías" : view === "settings" ? "Configuración" : "Carta"}
              </Heading>
              <Text tone="muted">
                {view === "categories"
                  ? "Nombre y visibilidad. El orden de la carta se cambia en Configuración."
                  : view === "settings"
                    ? "El orden que ve el cliente en la carta."
                    : `${visibleProducts.length} de ${products.length}`}
              </Text>
            </div>
            {view === "products" ? (
              <Button type="button" variant="accent" className="h-11 shrink-0" onClick={() => setAddOpen(true)}>
                <PlusIcon aria-hidden />
                Agregar
              </Button>
            ) : null}
          </div>
        </header>
      )}

      <div aria-live="polite" className="empty:hidden">
        {status ? <p className="rounded-xl bg-olive-hover px-4 py-3 text-base font-semibold">{status}</p> : null}
      </div>
      {error ? (
        <p role="alert" className="rounded-xl border border-olive-soft px-4 py-3 text-base">
          {error}
        </p>
      ) : null}

      {view === "home" ? (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <SectionTile
              icon={PizzaIcon}
              title="Productos"
              value={products.length}
              detail="Precio, foto, descripción y disponibilidad"
              onClick={() => openProducts()}
            />
            <SectionTile
              icon={LayoutGridIcon}
              title="Categorías"
              value={categories.length}
              detail="Nombre y visibilidad en la carta"
              onClick={() => openView("categories")}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <ShortcutTile icon={BanIcon} label="Agotados" value={counts.soldOut} onClick={() => openProducts({ shortcut: "soldOut" })} />
            <ShortcutTile icon={EyeOffIcon} label="Ocultos" value={counts.hidden} onClick={() => openProducts({ shortcut: "hidden" })} />
            <ShortcutTile icon={ImageOffIcon} label="Sin foto" value={counts.noPhoto} onClick={() => openProducts({ shortcut: "noPhoto" })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled={!defaultCategoryId}
              onClick={() => setProductSession({ key: `new-${Date.now()}`, product: null })}
            >
              <PlusIcon aria-hidden />
              Nuevo producto
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => setCategorySession({ key: `new-${Date.now()}`, category: null })}
            >
              <PlusIcon aria-hidden />
              Añadir nueva categoría
            </Button>
          </div>
        </div>
      ) : null}

      {view === "categories" ? (
        <div className="flex flex-col gap-3">
          <Button type="button" className="h-11 self-stretch sm:self-start" onClick={() => setCategorySession({ key: `new-${Date.now()}`, category: null })}>
            <PlusIcon aria-hidden />
            Añadir nueva categoría
          </Button>
          <ol className="flex flex-col gap-2" aria-label="Categorías de la carta">
            {orderedCategories.map((category) => {
              const count = counts.byCategory.get(category.id) ?? 0
              const busy = busyId === category.id
              return (
                <li
                  key={category.id}
                  aria-busy={busy}
                  className="flex min-w-0 items-stretch gap-2 rounded-2xl border border-olive-line bg-surface-raised p-2"
                >
                  <button
                    type="button"
                    className="flex min-h-11 min-w-0 flex-1 flex-col items-start justify-center gap-1 rounded-xl px-2 text-left outline-none hover:bg-olive-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                    onClick={() => openProducts({ categoryId: category.id })}
                  >
                    <span className="w-full truncate font-heading text-lg leading-tight font-bold">{category.name}</span>
                    <span className="font-label text-sm text-olive-muted">
                      {count} {count === 1 ? "producto" : "productos"}
                    </span>
                    <CategoryFlag isVisible={category.isVisible} />
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-11 px-3"
                      disabled={busy}
                      onClick={() => setCategorySession({ key: category.id, category })}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={busy}
                      aria-label={`Eliminar ${category.name}`}
                      onClick={() => {
                        setDeleteError("")
                        setCategoryToDelete(category)
                      }}
                    >
                      <Trash2Icon aria-hidden />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      ) : null}

      {view === "settings" ? (
        <CategoryOrder
          categories={orderedCategories}
          counts={counts.byCategory}
          busyId={busyId}
          locked={busyId !== null}
          onEdit={(category) => setCategorySession({ key: category.id, category })}
          onMove={(category, direction) => moveWithin(visibleCategories, category, direction)}
          onReorder={reorderVisible}
        />
      ) : null}

      {view === "products" ? (
        <div className="flex flex-col gap-4">
          <div className="relative">
            <SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-olive-muted" />
            <Input
              type="search"
              aria-label="Buscar producto"
              className="h-12 pl-10"
              value={query}
              placeholder="Buscar por nombre"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="min-w-0 overflow-x-auto pb-1">
            <div className="flex w-max gap-2" role="group" aria-label="Categoría">
              <Chip pressed={categoryId === "all"} onClick={() => setCategoryId("all")}>
                Todas
              </Chip>
              {orderedCategories.map((category) => (
                <Chip key={category.id} pressed={categoryId === category.id} onClick={() => setCategoryId(category.id)}>
                  {category.name}
                </Chip>
              ))}
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap gap-2" role="group" aria-label="Estado">
            <Chip pressed={shortcut === "none"} onClick={() => setShortcut("none")}>
              Todos
            </Chip>
            {(["soldOut", "hidden", "noPhoto"] as const).map((key) => (
              <Chip key={key} pressed={shortcut === key} onClick={() => setShortcut(key)}>
                {shortcutLabel[key]}
              </Chip>
            ))}
            <Chip pressed={false} onClick={() => openView("categories")}>
              Categorías
            </Chip>
            <Chip pressed={false} onClick={() => openView("settings")}>
              Configuración
            </Chip>
          </div>

          {canReorder ? (
            <Text size="sm" tone="muted">
              Para cambiar el orden, usa «Mover antes» o «Mover después» en el menú de cada producto.
            </Text>
          ) : null}

          {visibleProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-olive-soft px-4 py-10 text-center">
              <Text>{shortcut === "hidden" ? "No hay productos ocultos. Los que mostraste están en Todos." : "No hay productos con ese filtro."}</Text>
            </div>
          ) : (
            <>
            <ul className="flex flex-col gap-3 lg:hidden">
              {visibleProducts.map((product, index) => (
                <li key={product.id}>
                  <ProductTile
                    product={product}
                    categoryName={names.get(product.categoryId) ?? "Sin categoría"}
                    showCategory={categoryId === "all"}
                    busy={productIsBusy(product.id)}
                    canReorder={canReorder}
                    isFirst={index === 0}
                    isLast={index === visibleProducts.length - 1}
                    onEdit={() => setProductSession({ key: product.id, product })}
                    onPrice={() => setPriceTarget(product)}
                    onAvailability={() =>
                      void patchProduct(
                        product,
                        { availability: product.availability === "available" ? "unavailable" : "available" },
                        product.availability === "available" ? `${product.name} quedó agotado.` : `${product.name} quedó disponible.`,
                      )
                    }
                    onVisibility={() =>
                      void patchProduct(
                        product,
                        { isVisible: !product.isVisible },
                        visibilityMessage(product, !product.isVisible),
                      )
                    }
                    onMove={(direction) => moveProduct(product, direction)}
                  />
                </li>
              ))}
            </ul>
            <ProductTable
              products={visibleProducts}
              names={names}
              busyId={busyId}
              heldVisibility={heldVisibility}
              canReorder={canReorder}
              onEdit={(product) => setProductSession({ key: product.id, product })}
              onPrice={setPriceTarget}
              onAvailability={(product) =>
                void patchProduct(
                  product,
                  { availability: product.availability === "available" ? "unavailable" : "available" },
                  product.availability === "available" ? `${product.name} quedó agotado.` : `${product.name} quedó disponible.`,
                )
              }
              onVisibility={(product) =>
                void patchProduct(
                  product,
                  { isVisible: !product.isVisible },
                  visibilityMessage(product, !product.isVisible),
                )
              }
              onMove={moveProduct}
            />
            </>
          )}
        </div>
      ) : null}

      {productSession ? (
        <ProductEditor
          key={productSession.key}
          open
          categories={orderedCategories}
          product={productSession.product}
          defaultCategoryId={productSession.product?.categoryId ?? defaultCategoryId}
          onOpenChange={(open) => {
            if (!open) setProductSession(null)
          }}
          onRefresh={refresh}
          onSaved={(message) => {
            setProductSession(null)
            refresh(message)
          }}
        />
      ) : null}
      {categorySession ? (
        <CategoryEditor
          key={categorySession.key}
          open
          category={categorySession.category}
          existingIds={orderedCategories.map((item) => item.id)}
          nextOrder={orderedCategories.length + 1}
          onOpenChange={(open) => {
            if (!open) setCategorySession(null)
          }}
          onSaved={(message) => {
            setCategorySession(null)
            refresh(message)
          }}
        />
      ) : null}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar</DialogTitle>
            <DialogDescription className="text-base text-foreground">
              Un producto entra en una categoría que ya existe.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              disabled={!defaultCategoryId}
              onClick={() => {
                setAddOpen(false)
                setProductSession({ key: `new-${Date.now()}`, product: null })
              }}
            >
              <PlusIcon aria-hidden />
              Agregar producto
            </Button>
            <div className="flex flex-col gap-2 rounded-2xl border border-olive-line bg-surface-raised p-3">
              <Text tone="muted">Categorías</Text>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setAddOpen(false)
                  setCategorySession({ key: `new-${Date.now()}`, category: null })
                }}
              >
                <PlusIcon aria-hidden />
                Añadir nueva categoría
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDeleteDialog
        open={categoryToDelete !== null}
        title={categoryToDelete ? `Eliminar ${categoryToDelete.name}` : "Eliminar categoría"}
        description={
          deleteCount > 0
            ? `«${categoryToDelete?.name ?? ""}» tiene ${deleteCount === 1 ? "1 producto" : `${deleteCount} productos`}. Muévelos o elimínalos antes. Si confirmas ahora, la categoría no se borra.`
            : `«${categoryToDelete?.name ?? ""}» deja de existir en la carta. No se puede deshacer.`
        }
        pending={categoryToDelete ? busyId === categoryToDelete.id : false}
        error={deleteError}
        onOpenChange={(open) => {
          if (!open) {
            setCategoryToDelete(null)
            setDeleteError("")
          }
        }}
        onConfirm={() => void removeCategory()}
      />
      <PriceDialog
        product={priceTarget}
        busy={priceTarget ? busyId === priceTarget.id : false}
        onOpenChange={(open) => {
          if (!open) setPriceTarget(null)
        }}
        onSave={(price) => {
          if (!priceTarget) return
          const target = priceTarget
          void patchProduct(target, { priceClp: price }, `Precio de ${target.name} guardado.`).then((saved) => {
            if (saved) setPriceTarget(null)
          })
        }}
      />
    </div>
  )
}

function SectionTile({
  icon: Icon,
  title,
  value,
  detail,
  onClick,
}: {
  icon: LucideIcon
  title: string
  value: number
  detail: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-40 flex-col justify-between gap-6 rounded-2xl border border-olive-line bg-surface-raised p-5 text-left shadow-tactile outline-none transition-shadow hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="flex items-center justify-between">
        <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Icon aria-hidden className="size-6" />
        </span>
        <ChevronRightIcon aria-hidden className="size-5 text-olive-muted transition-transform group-hover:translate-x-0.5" />
      </span>
      <span className="flex flex-col gap-1">
        <span className="flex items-baseline gap-2">
          <span className="font-heading text-2xl font-extrabold">{title}</span>
          <span className="font-label text-base text-olive-muted tabular-nums">{value}</span>
        </span>
        <span className="text-base text-olive-strong">{detail}</span>
      </span>
    </button>
  )
}

function ShortcutTile({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: LucideIcon
  label: string
  value: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-28 flex-col justify-between gap-3 rounded-2xl border border-olive-line bg-surface-raised p-3 text-left outline-none hover:bg-olive-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-4"
    >
      <Icon aria-hidden className="size-5 text-olive-muted" />
      <span className="flex flex-col">
        <span className="font-heading text-2xl font-extrabold tabular-nums">{value}</span>
        <span className="text-sm text-olive-strong">{label}</span>
      </span>
    </button>
  )
}

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "h-11 shrink-0 rounded-4xl border px-4 text-sm font-semibold whitespace-nowrap outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        pressed ? "border-transparent bg-primary text-primary-foreground" : "border-olive-soft bg-transparent hover:bg-olive-hover",
      )}
    >
      {children}
    </button>
  )
}

function ProductTable({
  products,
  names,
  busyId,
  heldVisibility,
  canReorder,
  onEdit,
  onPrice,
  onAvailability,
  onVisibility,
  onMove,
}: {
  products: AdminProduct[]
  names: Map<string, string>
  busyId: string | null
  heldVisibility: Record<string, boolean>
  canReorder: boolean
  onEdit: (product: AdminProduct) => void
  onPrice: (product: AdminProduct) => void
  onAvailability: (product: AdminProduct) => void
  onVisibility: (product: AdminProduct) => void
  onMove: (product: AdminProduct, direction: -1 | 1) => void
}) {
  return (
    <div className="admin-card hidden overflow-x-auto lg:block">
      <table className="w-full min-w-[40rem] text-sm">
        <caption className="sr-only">Productos de la carta</caption>
        <thead>
          <tr className="border-b border-olive-line text-left text-xs text-olive-muted">
            <th className="px-4 py-3 font-semibold">Producto</th>
            <th className="px-3 py-3 font-semibold">Categoría</th>
            <th className="px-3 py-3 font-semibold">Precio</th>
            <th className="px-3 py-3 font-semibold">Disponibilidad</th>
            <th className="px-3 py-3 font-semibold">Visibilidad</th>
            <th className="px-4 py-3 text-right font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, index) => {
            const busy = busyId === product.id || product.id in heldVisibility
            return (
              <tr key={product.id} aria-busy={busy} className="border-b border-olive-line/70 last:border-b-0">
                <td className="px-4 py-3">
                  <button type="button" className="flex min-w-0 items-center gap-3 text-left" disabled={busy} onClick={() => onEdit(product)}>
                    <ProductImage src={product.imageUrl} name={product.name} sizes="40px" className="size-10 rounded-lg object-cover" />
                    <span className="min-w-0">
                      <span className="block truncate font-heading font-bold text-olive">{product.name}</span>
                      <span className="block max-w-64 truncate text-xs text-olive-muted">{product.description}</span>
                    </span>
                  </button>
                </td>
                <td className="px-3 py-3 text-olive-strong">{names.get(product.categoryId) ?? "Sin categoría"}</td>
                <td className="px-3 py-3 font-semibold text-olive">{formatCLP(product.priceClp)}</td>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    className="h-11 rounded-xl px-2 text-sm font-semibold text-olive underline-offset-4 hover:underline"
                    disabled={busy}
                    onClick={() => onAvailability(product)}
                  >
                    {product.availability === "available" ? "Disponible" : "Agotado"}
                  </button>
                </td>
                <td className="px-3 py-3 text-olive-strong">{product.isVisible ? "Visible" : "Oculto"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button type="button" variant="ghost" size="sm" className="h-11" disabled={busy} onClick={() => onEdit(product)}>
                      Editar
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-11" disabled={busy} onClick={() => onPrice(product)}>
                      Precio
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-11" disabled={busy} onClick={() => onVisibility(product)}>
                      {product.isVisible ? "Ocultar" : "Mostrar"}
                    </Button>
                    {canReorder ? (
                      <>
                        <Button type="button" variant="ghost" size="sm" className="h-11" disabled={busy || index === 0} onClick={() => onMove(product, -1)}>
                          Subir
                        </Button>
                        <Button type="button" variant="ghost" size="sm" className="h-11" disabled={busy || index === products.length - 1} onClick={() => onMove(product, 1)}>
                          Bajar
                        </Button>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ProductTile({
  product,
  categoryName,
  showCategory,
  busy,
  canReorder,
  isFirst,
  isLast,
  onEdit,
  onPrice,
  onAvailability,
  onVisibility,
  onMove,
}: {
  product: AdminProduct
  categoryName: string
  showCategory: boolean
  busy: boolean
  canReorder: boolean
  isFirst: boolean
  isLast: boolean
  onEdit: () => void
  onPrice: () => void
  onAvailability: () => void
  onVisibility: () => void
  onMove: (direction: -1 | 1) => void
}) {
  const muted = product.availability === "unavailable" || !product.isVisible
  return (
    <article
      aria-busy={busy}
      className="admin-card flex min-w-0 flex-col gap-3 p-3"
    >
      <button
        type="button"
        onClick={onEdit}
        disabled={busy}
        aria-label={`Editar ${product.name}`}
        className="flex min-w-0 items-center gap-3 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
      >
        <span className="relative size-16 shrink-0 overflow-hidden rounded-xl">
          <ProductImage src={product.imageUrl} name={product.name} sizes="64px" className={cn("size-16 rounded-xl object-cover", muted && "opacity-60")} />
        </span>
        <span className="min-w-0 flex-1">
          {showCategory ? <span className="block truncate text-xs text-olive-muted">{categoryName}</span> : null}
          <span className="block truncate font-heading text-base leading-tight font-bold">{product.name}</span>
          <span className="mt-0.5 line-clamp-2 text-sm text-olive-muted">{product.description}</span>
          <span className="mt-1 block font-label text-sm font-bold text-olive">{formatCLP(product.priceClp)}</span>
        </span>
      </button>
      <ProductFlags product={product} />
      <div className="flex min-w-0 flex-col gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={product.availability === "available"}
          aria-label={product.availability === "available" ? `Marcar ${product.name} agotado` : `Marcar ${product.name} disponible`}
          disabled={busy}
          onClick={onAvailability}
          className="flex h-11 min-w-0 items-center justify-between gap-3 rounded-xl bg-[#f3f1e6] px-3 text-sm font-semibold text-olive outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span>{product.availability === "available" ? "Disponible" : "Agotado"}</span>
          <span
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full",
              product.availability === "available" ? "bg-status-good-solid" : "bg-olive-soft",
            )}
          >
            <span className={cn("absolute top-0.5 size-6 rounded-full bg-cream shadow-tactile", product.availability === "available" ? "right-0.5" : "left-0.5")} />
          </span>
        </button>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.75rem] gap-2">
        <Button type="button" variant="secondary" size="sm" className="admin-action-secondary h-11 min-w-0 px-2" disabled={busy} onClick={onEdit}>
          <PencilIcon aria-hidden />
          Editar
        </Button>
        <Button type="button" variant="secondary" size="sm" className="h-11 min-w-0 px-2" disabled={busy} onClick={onVisibility}>
          {product.isVisible ? "Ocultar" : "Mostrar"}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" disabled={busy} aria-label={`Más opciones de ${product.name}`}>
              <EllipsisIcon aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem className="min-h-11" onSelect={onEdit}>
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11" onSelect={onPrice}>
              Cambiar precio
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11" onSelect={onAvailability}>
              {product.availability === "available" ? "Marcar agotado" : "Marcar disponible"}
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11" onSelect={onVisibility}>
              {product.isVisible ? "Ocultar de la carta" : "Mostrar en la carta"}
            </DropdownMenuItem>
            {canReorder ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="min-h-11" disabled={isFirst} onSelect={() => onMove(-1)}>
                  Mover antes
                </DropdownMenuItem>
                <DropdownMenuItem className="min-h-11" disabled={isLast} onSelect={() => onMove(1)}>
                  Mover después
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>
    </article>
  )
}

function PriceDialog({
  product,
  busy,
  onOpenChange,
  onSave,
}: {
  product: AdminProduct | null
  busy: boolean
  onOpenChange: (open: boolean) => void
  onSave: (price: number) => void
}) {
  return (
    <Dialog open={product !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Precio de {product?.name}</DialogTitle>
          <DialogDescription>Un entero en pesos. Se publica al guardar.</DialogDescription>
        </DialogHeader>
        {product ? <PriceForm key={product.id} product={product} busy={busy} onSave={onSave} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function PriceForm({ product, busy, onSave }: { product: AdminProduct; busy: boolean; onSave: (price: number) => void }) {
  const [value, setValue] = useState(String(product.priceClp))
  const [fieldError, setFieldError] = useState("")

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        const price = Number(value)
        if (!Number.isInteger(price) || price < 0 || price > 1_000_000) {
          setFieldError("El precio tiene que ser un entero entre 0 y 1.000.000.")
          return
        }
        onSave(price)
      }}
    >
      <Field data-invalid={fieldError ? true : undefined}>
        <FieldLabel htmlFor="catalog-quick-price">Precio en pesos</FieldLabel>
        <Input
          id="catalog-quick-price"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        {fieldError ? <FieldError>{fieldError}</FieldError> : null}
      </Field>
      <DialogFooter>
        <Button type="submit" loading={busy}>
          Guardar precio
        </Button>
      </DialogFooter>
    </form>
  )
}

function fold(value: string) {
  return value
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
}

export { CatalogEditor }
