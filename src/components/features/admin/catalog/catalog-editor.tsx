"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Heading, Text } from "@/components/ui/typography"
import { adminRequestHeader, adminRequestValue } from "@/lib/auth/session-policy"
import type { AdminCategory, AdminProduct } from "@/lib/catalog/types"

function CatalogEditor({ categories, products }: { categories: AdminCategory[]; products: AdminProduct[] }) {
  const router = useRouter()
  const [message, setMessage] = useState("")
  const [pending, setPending] = useState(false)
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "")
  const [productId, setProductId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<"product" | "category" | null>(null)

  const selected = products.find((product) => product.id === productId) ?? null
  const visibleProducts = products.filter((product) => product.categoryId === categoryId).toSorted((a, b) => a.sortOrder - b.sortOrder)

  async function send(body: unknown) {
    setPending(true)
    setMessage("")
    try {
      const response = await fetch("/api/admin/catalog", {
        method: "POST",
        headers: { "content-type": "application/json", [adminRequestHeader]: adminRequestValue },
        body: JSON.stringify(body),
      })
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setMessage(payload?.message || "No se pudo guardar.")
        return false
      }
      setMessage("Listo.")
      setConfirmDelete(null)
      router.refresh()
      return true
    } catch {
      setMessage("No se pudo guardar. Revisa la conexión.")
      return false
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Heading as="h1" size="h3">
          Carta
        </Heading>
        <Text>Los cambios se guardan en Firestore. Ocultar un producto lo saca de la carta pública. Eliminarlo borra el registro.</Text>
      </header>

      <CategoryForm
        categories={categories}
        pending={pending}
        confirmDelete={confirmDelete === "category"}
        onSave={(category) => void send({ action: "save-category", category })}
        onAskDelete={() => setConfirmDelete("category")}
        onDelete={(id) => void send({ action: "delete-category", id })}
      />

      <section className="flex flex-col gap-4 rounded-xl border border-olive-line bg-surface-raised p-4">
        <Heading as="h2" size="h4">
          Productos
        </Heading>
        <Label htmlFor="catalog-category">Categoría</Label>
        <select
          id="catalog-category"
          className="h-11 rounded-lg border border-input bg-transparent px-3 text-base"
          value={categoryId}
          onChange={(event) => {
            setCategoryId(event.target.value)
            setProductId(null)
            setConfirmDelete(null)
          }}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
              {category.isVisible ? "" : " · oculta"}
            </option>
          ))}
        </select>
        <ul className="flex flex-col gap-2">
          {visibleProducts.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-olive-line px-3 py-2 text-left"
                onClick={() => {
                  setProductId(product.id)
                  setConfirmDelete(null)
                }}
              >
                <span className="font-semibold">{product.name}</span>
                <span className="font-label text-sm text-olive-muted">
                  {product.isVisible ? "" : "Oculto · "}
                  {product.availability === "available" ? "Disponible" : "Agotado"}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setProductId(null)
            setConfirmDelete(null)
          }}
        >
          Agregar producto
        </Button>
        <ProductForm
          key={selected?.id ?? `new-${categoryId}`}
          categories={categories}
          categoryId={categoryId}
          product={selected}
          pending={pending}
          confirmDelete={confirmDelete === "product"}
          onSave={(product) => void send({ action: "save-product", product })}
          onAskDelete={() => setConfirmDelete("product")}
          onDelete={(id) => void send({ action: "delete-product", id })}
          onMessage={setMessage}
        />
      </section>
      {message ? <p role="status">{message}</p> : null}
    </div>
  )
}

function CategoryForm({
  categories,
  pending,
  confirmDelete,
  onSave,
  onAskDelete,
  onDelete,
}: {
  categories: AdminCategory[]
  pending: boolean
  confirmDelete: boolean
  onSave: (category: { id?: string; name: string; description: string | null; sortOrder: number; isVisible: boolean }) => void
  onAskDelete: () => void
  onDelete: (id: string) => void
}) {
  const [id, setId] = useState(categories[0]?.id ?? "")
  const current = categories.find((category) => category.id === id)
  const [name, setName] = useState(current?.name ?? "")
  const [sortOrder, setSortOrder] = useState(String(current?.sortOrder ?? categories.length + 1))
  const [isVisible, setIsVisible] = useState(current?.isVisible ?? true)

  function load(nextId: string) {
    const next = categories.find((category) => category.id === nextId)
    setId(nextId)
    setName(next?.name ?? "")
    setSortOrder(String(next?.sortOrder ?? categories.length + 1))
    setIsVisible(next?.isVisible ?? true)
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-olive-line bg-surface-raised p-4">
      <Heading as="h2" size="h4">
        Categorías
      </Heading>
      <Label htmlFor="catalog-category-edit">Editar</Label>
      <select id="catalog-category-edit" className="h-11 rounded-lg border border-input bg-transparent px-3 text-base" value={id} onChange={(event) => load(event.target.value)}>
        <option value="">Nueva categoría</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <Label htmlFor="catalog-category-name">Nombre</Label>
      <Input id="catalog-category-name" value={name} onChange={(event) => setName(event.target.value)} />
      <Label htmlFor="catalog-category-order">Orden</Label>
      <Input id="catalog-category-order" inputMode="numeric" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} />
      <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={isVisible} onChange={(event) => setIsVisible(event.target.checked)} />
        Visible en la carta
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            onSave({
              id: id || undefined,
              name,
              description: current?.description ?? null,
              sortOrder: Number(sortOrder),
              isVisible,
            })
          }
        >
          Guardar categoría
        </Button>
        {id ? (
          confirmDelete ? (
            <Button type="button" variant="secondary" disabled={pending} onClick={() => onDelete(id)}>
              Confirmar eliminación
            </Button>
          ) : (
            <Button type="button" variant="secondary" disabled={pending} onClick={onAskDelete}>
              Eliminar categoría
            </Button>
          )
        ) : null}
      </div>
    </section>
  )
}

function ProductForm({
  categories,
  categoryId,
  product,
  pending,
  confirmDelete,
  onSave,
  onAskDelete,
  onDelete,
  onMessage,
}: {
  categories: AdminCategory[]
  categoryId: string
  product: AdminProduct | null
  pending: boolean
  confirmDelete: boolean
  onSave: (product: {
    id?: string
    categoryId: string
    name: string
    description: string
    priceClp: number
    availability: "available" | "unavailable"
    isVisible: boolean
    isFeatured: boolean
    sortOrder: number
  }) => void
  onAskDelete: () => void
  onDelete: (id: string) => void
  onMessage: (message: string) => void
}) {
  const [name, setName] = useState(product?.name ?? "")
  const [description, setDescription] = useState(product?.description ?? "")
  const [price, setPrice] = useState(product ? String(product.priceClp) : "")
  const [availability, setAvailability] = useState<"available" | "unavailable">(product?.availability ?? "available")
  const [isVisible, setIsVisible] = useState(product?.isVisible ?? true)
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false)
  const [sortOrder, setSortOrder] = useState(String(product?.sortOrder ?? 1))
  const [destination, setDestination] = useState(product?.categoryId ?? categoryId)

  async function upload(file: File) {
    if (!product) return
    const body = new FormData()
    body.set("productId", product.id)
    body.set("file", file)
    onMessage("")
    const response = await fetch("/api/admin/catalog/image", {
      method: "POST",
      headers: { [adminRequestHeader]: adminRequestValue },
      body,
    })
    const payload = (await response.json().catch(() => null)) as { message?: string } | null
    onMessage(response.ok ? "Foto actualizada." : payload?.message || "No se pudo guardar la foto.")
    if (response.ok) window.location.reload()
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        onSave({
          id: product?.id,
          categoryId: destination,
          name,
          description,
          priceClp: Number(price),
          availability,
          isVisible,
          isFeatured,
          sortOrder: Number(sortOrder),
        })
      }}
    >
      <Label htmlFor="catalog-product-name">Nombre</Label>
      <Input id="catalog-product-name" value={name} onChange={(event) => setName(event.target.value)} required />
      <Label htmlFor="catalog-product-description">Descripción</Label>
      <Textarea id="catalog-product-description" value={description} onChange={(event) => setDescription(event.target.value)} />
      <Text size="sm" tone="muted">
        Si la dejas vacía, la carta usa el espacio en blanco y la ilustración de respaldo cuando no hay foto.
      </Text>
      <Label htmlFor="catalog-product-price">Precio en pesos</Label>
      <Input id="catalog-product-price" inputMode="numeric" value={price} onChange={(event) => setPrice(event.target.value)} required />
      <Label htmlFor="catalog-product-availability">Disponibilidad</Label>
      <select id="catalog-product-availability" className="h-11 rounded-lg border border-input bg-transparent px-3 text-base" value={availability} onChange={(event) => setAvailability(event.target.value as "available" | "unavailable")}>
        <option value="available">Disponible</option>
        <option value="unavailable">No disponible</option>
      </select>
      <Label htmlFor="catalog-product-destination">Categoría</Label>
      <select id="catalog-product-destination" className="h-11 rounded-lg border border-input bg-transparent px-3 text-base" value={destination} onChange={(event) => setDestination(event.target.value)}>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <Label htmlFor="catalog-product-order">Orden</Label>
      <Input id="catalog-product-order" inputMode="numeric" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} />
      <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={isVisible} onChange={(event) => setIsVisible(event.target.checked)} />
        Visible en la carta
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={isFeatured} onChange={(event) => setIsFeatured(event.target.checked)} />
        Sugerencia del chef
      </label>
      {product ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="catalog-product-photo">Fotografía</Label>
          <input
            id="catalog-product-photo"
            className="min-h-11 text-sm"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void upload(file)
            }}
          />
        </div>
      ) : (
        <Text size="sm" tone="muted">
          Guarda el producto antes de subir una foto.
        </Text>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" disabled={pending}>
          {product ? "Guardar producto" : "Crear producto"}
        </Button>
        {product ? (
          confirmDelete ? (
            <Button type="button" variant="secondary" disabled={pending} onClick={() => onDelete(product.id)}>
              Confirmar eliminación
            </Button>
          ) : (
            <Button type="button" variant="secondary" disabled={pending} onClick={onAskDelete}>
              Eliminar producto
            </Button>
          )
        ) : null}
      </div>
    </form>
  )
}

export { CatalogEditor }
