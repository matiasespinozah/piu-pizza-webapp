"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { adminRequestHeader, adminRequestValue } from "@/lib/auth/session-policy"

const fieldClass = "h-11 w-full min-w-0 rounded-xl border border-input bg-cream px-3 text-base"

function ManualReservationForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState("")
  const [exception, setException] = useState(false)
  const [reason, setReason] = useState("")

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setMessage("")
    try {
      const response = await fetch("/api/admin/reservations", {
        method: "POST",
        headers: { "content-type": "application/json", [adminRequestHeader]: adminRequestValue },
        body: JSON.stringify({
          customerName: String(form.get("customerName") ?? ""),
          customerPhone: String(form.get("customerPhone") ?? ""),
          date: String(form.get("date") ?? ""),
          preferredTime: String(form.get("preferredTime") ?? ""),
          partySize: Number(form.get("partySize") ?? 0),
          preferredZone: form.get("preferredZone") === "terrace" ? "terrace" : "salon",
          notes: String(form.get("notes") ?? ""),
          tableLabel: String(form.get("tableLabel") ?? ""),
          confirm: true,
          exceptionConfirmed: exception,
          exceptionReason: reason,
        }),
      })
      const body = (await response.json().catch(() => null)) as { message?: string; reservation?: { id: string } } | null
      if (!response.ok) {
        setMessage(body?.message || "No se pudo crear la reserva.")
        return
      }
      setOpen(false)
      router.push(body?.reservation?.id ? `/admin/reservas?id=${body.reservation.id}` : "/admin/reservas")
      router.refresh()
    } catch {
      setMessage("No se pudo crear la reserva.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" className="h-11 shrink-0">
          <Plus aria-hidden />
          Nueva reserva
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="admin-sheet max-h-[92svh] overflow-y-auto rounded-t-3xl px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <SheetTitle className="font-heading text-xl text-olive">Nueva reserva</SheetTitle>
        <SheetDescription className="text-sm text-olive-muted">Para un llamado o alguien que está en el local. No cambia los cupos configurados.</SheetDescription>
        <form className="mt-4 flex flex-col gap-3" onSubmit={onSubmit}>
          <Input name="customerName" required minLength={2} maxLength={80} placeholder="Nombre" aria-label="Nombre" className="bg-cream" />
          <Input name="customerPhone" required inputMode="tel" placeholder="+56 9 2887 3619" aria-label="Celular" className="bg-cream" />
          <div className="grid grid-cols-2 gap-2">
            <Input name="date" type="date" required aria-label="Fecha" className="bg-cream" />
            <Input name="preferredTime" type="time" required aria-label="Hora" className="bg-cream" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input name="partySize" type="number" required min={1} max={40} defaultValue={2} aria-label="Personas" className="bg-cream" />
            <select name="preferredZone" aria-label="Zona" className={fieldClass} defaultValue="salon">
              <option value="salon">Salón</option>
              <option value="terrace">Terraza</option>
            </select>
          </div>
          <Input name="tableLabel" maxLength={40} placeholder="Mesa, opcional" aria-label="Mesa" className="bg-cream" />
          <Input name="notes" maxLength={280} placeholder="Observación del cliente" aria-label="Observación" className="bg-cream" />
          <label className="flex min-h-11 items-center gap-3 text-sm text-olive">
            <input type="checkbox" className="size-5 accent-olive" checked={exception} onChange={(event) => setException(event.target.checked)} />
            Autorizar aunque no quepa en los cupos
          </label>
          {exception ? <Input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={160} placeholder="Motivo de la excepción" aria-label="Motivo de la excepción" className="bg-cream" required minLength={8} /> : null}
          {message ? <p className="text-sm font-semibold text-terracotta" role="alert">{message}</p> : null}
          <Button type="submit" className="h-12" disabled={pending || (exception && reason.trim().length < 8)}>
            {pending ? "Guardando" : "Guardar reserva"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}

export { ManualReservationForm }
