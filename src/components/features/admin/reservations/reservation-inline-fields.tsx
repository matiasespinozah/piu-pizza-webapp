"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { adminRequestHeader, adminRequestValue } from "@/lib/auth/session-policy"
import type { ReservationDetail } from "@/lib/reservations/views"

function TableField({ reservation }: { reservation: ReservationDetail }) {
  const field = useSave(reservation)
  const current = reservation.tableLabel ?? ""
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(current)

  if (!editing) {
    return (
      <button
        type="button"
        className="flex min-h-11 w-full flex-col items-start rounded-xl bg-cream px-3 py-3 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        onClick={() => {
          setValue(current)
          setEditing(true)
        }}
      >
        <span className="font-heading text-lg font-bold text-olive">{current || "Sin mesa"}</span>
        <span className="text-sm text-olive-muted">{current ? "Toca para cambiarla. Es opcional." : "Toca para asignar una mesa. Es opcional."}</span>
      </button>
    )
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        void field.save("assign", { tableLabel: value }).then((ok) => {
          if (ok) setEditing(false)
        })
      }}
    >
      <label className="flex flex-col gap-1 text-sm font-semibold text-olive">
        Mesa
        <Input value={value} maxLength={40} placeholder="Opcional" aria-label="Mesa" className="bg-cream" onChange={(event) => setValue(event.target.value)} />
      </label>
      <div className="flex gap-2">
        <Button type="submit" className="h-11 flex-1" disabled={field.pending}>
          Guardar mesa
        </Button>
        <Button type="button" variant="secondary" className="h-11" disabled={field.pending} onClick={() => setEditing(false)}>
          Cancelar
        </Button>
      </div>
      {field.error ? <p className="text-sm font-semibold text-status-closed" role="alert">{field.error}</p> : null}
    </form>
  )
}

function NoteField({ reservation }: { reservation: ReservationDetail }) {
  const field = useSave(reservation)
  const current = reservation.internalNotes
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(current)

  if (!editing) {
    return (
      <button
        type="button"
        className="flex min-h-11 w-full flex-col items-start rounded-xl bg-cream px-3 py-3 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        onClick={() => {
          setValue(current)
          setEditing(true)
        }}
      >
        <span className="text-sm whitespace-pre-line text-olive-strong">{current || "Todavía no hay una nota del equipo."}</span>
        <span className="mt-1 text-sm text-olive-muted">Toca para {current ? "editarla" : "escribir una"}. Es opcional.</span>
      </button>
    )
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        void field.save("note", { internalNotes: value }).then((ok) => {
          if (ok) setEditing(false)
        })
      }}
    >
      <label className="flex flex-col gap-1 text-sm font-semibold text-olive">
        Nota interna
        <Textarea value={value} maxLength={280} rows={3} placeholder="Solo la ve el equipo" aria-label="Nota interna" className="min-h-24 bg-cream" onChange={(event) => setValue(event.target.value)} />
      </label>
      <div className="flex gap-2">
        <Button type="submit" className="h-11 flex-1" disabled={field.pending}>
          Guardar nota
        </Button>
        <Button type="button" variant="secondary" className="h-11" disabled={field.pending} onClick={() => setEditing(false)}>
          Cancelar
        </Button>
      </div>
      {field.error ? <p className="text-sm font-semibold text-status-closed" role="alert">{field.error}</p> : null}
    </form>
  )
}

function useSave(reservation: ReservationDetail) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  async function save(action: "assign" | "note", fields: { tableLabel?: string; internalNotes?: string }) {
    setPending(true)
    setError("")
    try {
      const response = await fetch(`/api/admin/reservations/${reservation.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", [adminRequestHeader]: adminRequestValue },
        body: JSON.stringify({ action, revision: reservation.revision, reason: "", ...fields }),
      })
      const body = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setError(body?.message || "No se pudo guardar.")
        return false
      }
      router.refresh()
      return true
    } catch {
      setError("No se pudo guardar.")
      return false
    } finally {
      setPending(false)
    }
  }

  return { pending, error, save }
}

export { NoteField, TableField }
