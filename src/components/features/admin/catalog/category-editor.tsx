"use client"

import { useEffect, useState } from "react"

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
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
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
import type { AdminCategory } from "@/lib/catalog/types"

import { postCatalog, type CategoryInput } from "./catalog-requests"

type CategoryEditorProps = {
  open: boolean
  category: AdminCategory | null
  nextOrder: number
  onOpenChange: (open: boolean) => void
  onSaved: (message: string) => void
}

function CategoryEditor({ open, category, nextOrder, onOpenChange, onSaved }: CategoryEditorProps) {
  const baseline = useState(() => draftFrom(category, nextOrder))[0]
  const [draft, setDraft] = useState(baseline)
  const [fieldError, setFieldError] = useState("")
  const [formError, setFormError] = useState("")
  const [pending, setPending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline)

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
    setPending(true)
    setFormError("")
    const saved = await postCatalog({
      action: "save-category",
      category: category ? { ...parsed.value, id: category.id } : parsed.value,
    })
    setPending(false)
    if (!saved.ok) {
      setFormError(saved.message)
      return
    }
    onSaved(category ? "Categoría guardada." : "Categoría creada.")
    onOpenChange(false)
  }

  async function remove() {
    if (!category) return
    setPending(true)
    const result = await postCatalog({ action: "delete-category", id: category.id })
    setPending(false)
    if (!result.ok) {
      setFormError(result.message)
      return
    }
    onSaved("Categoría eliminada.")
    onOpenChange(false)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
        <SheetContent
          side="right"
          className="w-full gap-0 overflow-hidden bg-background p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
        >
          <SheetHeader className="border-b border-olive-line pr-14">
            <SheetTitle>{category ? "Editar categoría" : "Nueva categoría"}</SheetTitle>
            <SheetDescription>El nombre, la descripción, la visibilidad y el orden se publican al guardar.</SheetDescription>
          </SheetHeader>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault()
              void save()
            }}
          >
            <div className="flex flex-col gap-4 overflow-y-auto p-4">
              <Field>
                <FieldLabel htmlFor="catalog-category-name">Nombre</FieldLabel>
                <Input
                  id="catalog-category-name"
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  required
                  autoComplete="off"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="catalog-category-description">Descripción</FieldLabel>
                <Textarea
                  id="catalog-category-description"
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="catalog-category-order">Orden</FieldLabel>
                <Input
                  id="catalog-category-order"
                  inputMode="numeric"
                  value={draft.sortOrder}
                  onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value })}
                />
              </Field>
              <Field orientation="horizontal" className="min-h-11">
                <Checkbox
                  id="catalog-category-visible"
                  checked={draft.isVisible}
                  onCheckedChange={(checked) => setDraft({ ...draft, isVisible: checked === true })}
                />
                <FieldLabel htmlFor="catalog-category-visible">Visible en la carta</FieldLabel>
              </Field>
              {fieldError ? <FieldError>{fieldError}</FieldError> : null}
              {formError ? (
                <p role="alert" className="text-base">
                  {formError}
                </p>
              ) : null}
            </div>
            <SheetFooter className="border-t border-olive-line bg-background pb-safe">
              <Button type="submit" loading={pending}>
                {category ? "Guardar categoría" : "Crear categoría"}
              </Button>
              {category ? (
                confirmDelete ? (
                  <Button type="button" variant="secondary" disabled={pending} onClick={() => void remove()}>
                    Confirmar eliminación
                  </Button>
                ) : (
                  <Button type="button" variant="secondary" disabled={pending} onClick={() => setConfirmDelete(true)}>
                    Eliminar categoría
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

type Draft = { name: string; description: string; sortOrder: string; isVisible: boolean }

function draftFrom(category: AdminCategory | null, nextOrder: number): Draft {
  return {
    name: category?.name ?? "",
    description: category?.description ?? "",
    sortOrder: String(category?.sortOrder ?? nextOrder),
    isVisible: category?.isVisible ?? true,
  }
}

function parseDraft(draft: Draft): { ok: true; value: CategoryInput } | { ok: false; message: string } {
  const name = draft.name.trim()
  const sortOrder = Number(draft.sortOrder)
  const description = draft.description.trim()
  if (!name || name.length > 80) return { ok: false, message: "El nombre es obligatorio y admite hasta 80 caracteres." }
  if (description.length > 280) return { ok: false, message: "La descripción admite hasta 280 caracteres." }
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 999) {
    return { ok: false, message: "El orden tiene que ser un entero entre 0 y 999." }
  }
  return { ok: true, value: { name, description: description || null, sortOrder, isVisible: draft.isVisible } }
}

export { CategoryEditor }
