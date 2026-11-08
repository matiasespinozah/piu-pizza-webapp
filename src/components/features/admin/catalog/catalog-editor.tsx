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
  SearchIcon,
  type LucideIcon,
} from "lucide-react"
import { cn } from "cn"

import { ProductImage } from "@/components/features/menu/product-image"
import { Badge } from "@/components/ui/badge"
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
import type { AdminCategory, AdminProduct } from "@/lib/catalog/types"

import { CategoryEditor } from "./category-editor"
import { categoryInput, postCatalog, productInput } from "./catalog-requests"
import { CategoryFlag, ProductFlags } from "./catalog-status"
import { ProductEditor } from "./product-editor"

type View = "home" | "products" | "categories"
type Shortcut = "none" | "soldOut" | "hidden" | "noPhoto"
type ProductSession = { key: string; product: AdminProduct | null }
type CategorySession = { key: string; category: AdminCategory | null }

const shortcutLabel: Record<Shortcut, string> = {
  none: "Todos los productos",
  soldOut: "Agotados",
  hidden: "Ocultos",
  noPhoto: "Sin foto",
}

function CatalogEditor({ categories, products }: { categories: AdminCategory[]; products: AdminProduct[] }) {
  const router = useRouter()
  const pendingScroll = useRef<number | null>(null)
  const [view, setView] = useState<View>("home")
  const [query, setQuery] = useState("")
  const [categoryId, setCategoryId] = useState("all")
  const [shortcut, setShortcut] = useState<Shortcut>("none")
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [productSession, setProductSession] = useState<ProductSession | null>(null)
  const [categorySession, setCategorySession] = useState<CategorySession | null>(null)
  const [priceTarget, setPriceTarget] = useState<AdminProduct | null>(null)

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
  const productsTitle = categoryId !== "all" ? (names.get(categoryId) ?? "Categoría") : shortcutLabel[shortcut]

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
    setBusyId(product.id)
    setError("")
    const result = await postCatalog({ action: "save-product", product: productInput(product, patch) })
    setBusyId(null)
    if (!result.ok) {
      setError(result.message)
      return false
    }
    refresh(message)
    return true
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

  function moveCategory(category: AdminCategory, direction: -1 | 1) {
    const index = orderedCategories.findIndex((item) => item.id === category.id)
    const neighbor = orderedCategories[index + direction]
    if (!neighbor) return
    void swapOrder(
      {
        id: category.id,
        save: () => postCatalog({ action: "save-category", category: categoryInput(category, { sortOrder: neighbor.sortOrder }) }),
      },
      () => postCatalog({ action: "save-category", category: categoryInput(neighbor, { sortOrder: category.sortOrder }) }),
      "Orden de categorías guardado.",
    )
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {view === "home" ? (
        <header className="flex flex-col gap-1">
          <Heading as="h1" size="h3">
            Carta
          </Heading>
          <Text tone="muted">Elige qué quieres revisar.</Text>
        </header>
      ) : (
        <header className="flex flex-col gap-3">
          <Button type="button" variant="ghost" size="sm" className="-ml-3 self-start" onClick={() => openView("home")}>
            <ArrowLeftIcon aria-hidden />
            Carta
          </Button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-1">
              <Heading as="h1" size="h3">
                {view === "categories" ? "Categorías" : productsTitle}
              </Heading>
              <Text tone="muted">
                {view === "categories"
                  ? `${categories.length} categorías. Toca una para ver sus productos.`
                  : `${visibleProducts.length} de ${products.length} productos`}
              </Text>
            </div>
            {view === "categories" ? (
              <Button type="button" onClick={() => setCategorySession({ key: `new-${Date.now()}`, category: null })}>
                <PlusIcon aria-hidden />
                Nueva categoría
              </Button>
            ) : (
              <Button
                type="button"
                disabled={!defaultCategoryId}
                onClick={() => setProductSession({ key: `new-${Date.now()}`, product: null })}
              >
                <PlusIcon aria-hidden />
                Nuevo producto
              </Button>
            )}
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
              detail="Nombre, orden y visibilidad en la carta"
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
              Nueva categoría
            </Button>
          </div>
        </div>
      ) : null}

      {view === "categories" ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {orderedCategories.map((category, index) => {
            const count = counts.byCategory.get(category.id) ?? 0
            const busy = busyId === category.id
            return (
              <li
                key={category.id}
                aria-busy={busy}
                className="flex flex-col overflow-hidden rounded-2xl border border-olive-line bg-surface-raised"
              >
                <button
                  type="button"
                  className="flex min-h-28 flex-1 flex-col items-start gap-2 p-4 text-left outline-none hover:bg-olive-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  onClick={() => openProducts({ categoryId: category.id })}
                >
                  <span className="flex w-full items-start justify-between gap-2">
                    <span className="font-heading text-lg leading-tight font-bold">{category.name}</span>
                    <ChevronRightIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-olive-muted" />
                  </span>
                  <span className="font-label text-sm text-olive-muted">
                    {count} {count === 1 ? "producto" : "productos"}
                  </span>
                  <CategoryFlag isVisible={category.isVisible} />
                </button>
                <div className="flex items-center justify-between gap-2 border-t border-olive-line px-2 py-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => setCategorySession({ key: category.id, category })}
                  >
                    <PencilIcon aria-hidden />
                    Editar
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" disabled={busy} aria-label={`Más opciones de ${category.name}`}>
                        <EllipsisIcon aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem className="min-h-11" disabled={index === 0} onSelect={() => moveCategory(category, -1)}>
                        Mover antes
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="min-h-11"
                        disabled={index === orderedCategories.length - 1}
                        onSelect={() => moveCategory(category, 1)}
                      >
                        Mover después
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            )
          })}
        </ul>
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

          <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap" role="group" aria-label="Categoría">
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

          <div className="flex flex-wrap gap-2" role="group" aria-label="Estado">
            {(["soldOut", "hidden", "noPhoto"] as const).map((key) => (
              <Chip key={key} pressed={shortcut === key} onClick={() => setShortcut((current) => (current === key ? "none" : key))}>
                {shortcutLabel[key]}
              </Chip>
            ))}
          </div>

          {canReorder ? (
            <Text size="sm" tone="muted">
              Para cambiar el orden, usa «Mover antes» o «Mover después» en el menú de cada producto.
            </Text>
          ) : null}

          {visibleProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-olive-soft px-4 py-10 text-center">
              <Text>No hay productos con ese filtro.</Text>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {visibleProducts.map((product, index) => (
                <li key={product.id}>
                  <ProductTile
                    product={product}
                    categoryName={names.get(product.categoryId) ?? "Sin categoría"}
                    showCategory={categoryId === "all"}
                    busy={busyId === product.id}
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
                        product.isVisible ? `${product.name} quedó oculto.` : `${product.name} volvió a la carta.`,
                      )
                    }
                    onMove={(direction) => moveProduct(product, direction)}
                  />
                </li>
              ))}
            </ul>
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
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-olive-line bg-surface-raised"
    >
      <button
        type="button"
        onClick={onEdit}
        disabled={busy}
        aria-label={`Editar ${product.name}`}
        className="flex flex-1 flex-col text-left outline-none hover:bg-olive-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
      >
        <span className="relative block">
          <ProductImage
            src={product.imageUrl}
            name={product.name}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={cn("rounded-none", muted && "opacity-60")}
          />
          {product.isVisible ? null : (
            <span className="absolute top-2 left-2">
              <Badge variant="solid">Oculto</Badge>
            </span>
          )}
        </span>
        <span className="flex flex-1 flex-col gap-1 p-3">
          {showCategory ? <span className="truncate text-xs text-olive-muted">{categoryName}</span> : null}
          <span className="line-clamp-2 font-heading text-base leading-tight font-bold">{product.name}</span>
          <span className="mt-auto pt-1 font-label text-sm font-bold text-terracotta">{formatCLP(product.priceClp)}</span>
        </span>
      </button>
      <div className="flex items-center justify-between gap-1 border-t border-olive-line py-1 pr-1 pl-3">
        <span className="min-w-0">
          <ProductFlags product={{ ...product, isVisible: true }} />
        </span>
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
