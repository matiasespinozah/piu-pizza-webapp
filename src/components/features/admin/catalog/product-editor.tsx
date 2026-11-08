"use client"

import { useEffect, useRef, useState } from "react"

import { ProductCard } from "@/components/features/menu/product-card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { Text } from "@/components/ui/typography"
import type { AdminCategory, AdminProduct } from "@/lib/catalog/types"

import { postCatalog, postCatalogPhoto, type ProductInput } from "./catalog-requests"

const controlClass = "h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base"

type ProductEditorProps = {
  open: boolean
  categories: AdminCategory[]
  product: AdminProduct | null
  defaultCategoryId: string
  onOpenChange: (open: boolean) => void
  onRefresh: (message: string) => void
  onSaved: (message: string) => void
}

function ProductEditor({ open, categories, product, defaultCategoryId, onOpenChange, onRefresh, onSaved }: ProductEditorProps) {
  const baseline = useState(() => draftFrom(product, defaultCategoryId))[0]
  const [draft, setDraft] = useState(baseline)
  const [savedId, setSavedId] = useState<string | null>(product?.id ?? null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const previewRef = useRef<string | null>(null)
  const [fieldError, setFieldError] = useState("")
  const [formError, setFormError] = useState("")
  const [pending, setPending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    }
  }, [])

  function chooseFile(next: File | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    const url = next ? URL.createObjectURL(next) : null
    previewRef.current = url
    setFile(next)
    setPreviewUrl(url)
  }

  const dirty = serialize(draft, file?.name ?? "") !== serialize(baseline, "")

  useEffect(() => {
    if (!open || !dirty) return
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [open, dirty])

  function requestClose() {
    if (pending) return
    if (dirty) {
      setDiscardOpen(true)
      return
    }
    onOpenChange(false)
  }

  async function save() {
    const parsed = parseDraft(draft)
    if (!parsed.ok) {
      setFieldError(parsed.message)
      return
    }
    setFieldError("")
    setFormError("")
    setPending(true)
    const id = product?.id ?? savedId
    const saved = await postCatalog({
      action: "save-product",
      product: id ? { ...parsed.value, id } : parsed.value,
    })
    if (!saved.ok) {
      setPending(false)
      setFormError(saved.message)
      return
    }
    const nextId = id ?? saved.id
    if (nextId) setSavedId(nextId)
    if (file) {
      if (!nextId) {
        setPending(false)
        setFormError("El producto se guardó, pero no se pudo identificar para subir la foto.")
        return
      }
      const photo = await postCatalogPhoto(nextId, file)
      if (!photo.ok) {
        setPending(false)
        setFile(null)
        if (previewRef.current) URL.revokeObjectURL(previewRef.current)
        previewRef.current = null
        setPreviewUrl(null)
        setFormError(`${photo.message} El producto ya quedó guardado. Puedes elegir la foto otra vez.`)
        onRefresh("Producto guardado. La foto no se pudo subir.")
        return
      }
    }
    setPending(false)
    onSaved(id ? "Producto guardado." : "Producto creado.")
    onOpenChange(false)
  }

  async function remove() {
    if (!product) return
    setPending(true)
    setFormError("")
    const result = await postCatalog({ action: "delete-product", id: product.id })
    setPending(false)
    if (!result.ok) {
      setFormError(result.message)
      return
    }
    onSaved("Producto eliminado.")
    onOpenChange(false)
  }

  const price = Number(draft.priceClp)
  const preview = {
    id: product?.id ?? "vista-previa",
    categoryId: draft.categoryId,
    name: draft.name.trim() || "Sin nombre",
    description: draft.description.trim(),
    priceClp: Number.isInteger(price) && price >= 0 ? price : 0,
    imageUrl: previewUrl ?? product?.imageUrl ?? null,
    availability: draft.availability,
    isFeatured: draft.isFeatured,
    sortOrder: Number(draft.sortOrder) || 0,
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
        <SheetContent
          side="right"
          className="w-full gap-0 overflow-hidden bg-background p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
        >
          <SheetHeader className="border-b border-olive-line pr-14">
            <SheetTitle>{product ? "Editar producto" : "Nuevo producto"}</SheetTitle>
            <SheetDescription>Al guardar, el cambio se publica en la carta.</SheetDescription>
          </SheetHeader>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault()
              void save()
            }}
          >
            <div className="flex flex-col gap-4 overflow-y-auto p-4">
              <Field data-invalid={fieldError ? true : undefined}>
                <FieldLabel htmlFor="catalog-product-name">Nombre</FieldLabel>
                <Input
                  id="catalog-product-name"
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  required
                  autoComplete="off"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="catalog-product-description">Descripción</FieldLabel>
                <Textarea
                  id="catalog-product-description"
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                />
                <FieldDescription>Si la dejas vacía, la carta no inventa ingredientes.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="catalog-product-price">Precio en pesos</FieldLabel>
                <Input
                  id="catalog-product-price"
                  inputMode="numeric"
                  autoComplete="off"
                  value={draft.priceClp}
                  onChange={(event) => setDraft({ ...draft, priceClp: event.target.value })}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="catalog-product-availability">Disponibilidad</FieldLabel>
                <select
                  id="catalog-product-availability"
                  className={controlClass}
                  value={draft.availability}
                  onChange={(event) =>
                    setDraft({ ...draft, availability: event.target.value as AdminProduct["availability"] })
                  }
                >
                  <option value="available">Disponible</option>
                  <option value="unavailable">Agotado</option>
                </select>
                <FieldDescription>Agotado sigue visible en la carta, con el aviso de que no está disponible.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="catalog-product-category">Categoría</FieldLabel>
                <select
                  id="catalog-product-category"
                  className={controlClass}
                  value={draft.categoryId}
                  onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="catalog-product-order">Orden dentro de la categoría</FieldLabel>
                <Input
                  id="catalog-product-order"
                  inputMode="numeric"
                  value={draft.sortOrder}
                  onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value })}
                />
              </Field>
              <Field orientation="horizontal" className="min-h-11">
                <Checkbox
                  id="catalog-product-visible"
                  checked={draft.isVisible}
                  onCheckedChange={(checked) => setDraft({ ...draft, isVisible: checked === true })}
                />
                <FieldLabel htmlFor="catalog-product-visible">Visible en la carta</FieldLabel>
              </Field>
              <Field orientation="horizontal" className="min-h-11">
                <Checkbox
                  id="catalog-product-featured"
                  checked={draft.isFeatured}
                  onCheckedChange={(checked) => setDraft({ ...draft, isFeatured: checked === true })}
                />
                <FieldLabel htmlFor="catalog-product-featured">Sugerencia del chef</FieldLabel>
              </Field>
              <Field>
                <FieldLabel htmlFor="catalog-product-photo">Fotografía</FieldLabel>
                <input
                  id="catalog-product-photo"
                  className="min-h-11 text-base file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:font-semibold file:text-primary-foreground"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
                />
                <FieldDescription>Se prepara al guardar: WebP, hasta 1200 px y 150 KB.</FieldDescription>
              </Field>
              {fieldError ? <FieldError>{fieldError}</FieldError> : null}
              {formError ? (
                <p role="alert" className="text-base text-foreground">
                  {formError}
                </p>
              ) : null}
              <div className="rounded-xl border border-olive-line bg-background p-3">
                <Text size="sm" tone="muted">
                  {draft.isVisible
                    ? "Así se ve en la carta pública."
                    : "Oculto: no aparece en la carta pública. Esta es la vista si vuelves a mostrarlo."}
                </Text>
                <ProductCard product={preview} />
              </div>
            </div>
            <SheetFooter className="border-t border-olive-line bg-background pb-safe">
              <Button type="submit" loading={pending}>
                {product ? "Guardar producto" : "Crear producto"}
              </Button>
              {product ? (
                confirmDelete ? (
                  <Button type="button" variant="secondary" disabled={pending} onClick={() => void remove()}>
                    Confirmar eliminación
                  </Button>
                ) : (
                  <Button type="button" variant="secondary" disabled={pending} onClick={() => setConfirmDelete(true)}>
                    Eliminar producto
                  </Button>
                )
              ) : null}
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
      <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hay cambios sin guardar</DialogTitle>
            <DialogDescription>Si cierras ahora, se pierde lo que no alcanzaste a guardar.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setDiscardOpen(false)}>
              Seguir editando
            </Button>
            <Button
              type="button"
              onClick={() => {
                setDiscardOpen(false)
                onOpenChange(false)
              }}
            >
              Descartar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

type Draft = {
  categoryId: string
  name: string
  description: string
  priceClp: string
  availability: AdminProduct["availability"]
  isVisible: boolean
  isFeatured: boolean
  sortOrder: string
}

function draftFrom(product: AdminProduct | null, defaultCategoryId: string): Draft {
  return {
    categoryId: product?.categoryId ?? defaultCategoryId,
    name: product?.name ?? "",
    description: product?.description ?? "",
    priceClp: product ? String(product.priceClp) : "",
    availability: product?.availability ?? "available",
    isVisible: product?.isVisible ?? true,
    isFeatured: product?.isFeatured ?? false,
    sortOrder: String(product?.sortOrder ?? 1),
  }
}

function serialize(draft: Draft, fileName: string) {
  return JSON.stringify({ ...draft, fileName })
}

function parseDraft(draft: Draft): { ok: true; value: ProductInput } | { ok: false; message: string } {
  const name = draft.name.trim()
  const price = Number(draft.priceClp)
  const sortOrder = Number(draft.sortOrder)
  if (!name || name.length > 80) return { ok: false, message: "El nombre es obligatorio y admite hasta 80 caracteres." }
  if (!Number.isInteger(price) || price < 0 || price > 1_000_000) {
    return { ok: false, message: "El precio tiene que ser un entero entre 0 y 1.000.000." }
  }
  if (draft.description.trim().length > 500) return { ok: false, message: "La descripción admite hasta 500 caracteres." }
  if (!draft.categoryId) return { ok: false, message: "Elige una categoría." }
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 999) {
    return { ok: false, message: "El orden tiene que ser un entero entre 0 y 999." }
  }
  return {
    ok: true,
    value: {
      categoryId: draft.categoryId,
      name,
      description: draft.description.trim(),
      priceClp: price,
      availability: draft.availability,
      isVisible: draft.isVisible,
      isFeatured: draft.isFeatured,
      sortOrder,
    },
  }
}

export { ProductEditor }
