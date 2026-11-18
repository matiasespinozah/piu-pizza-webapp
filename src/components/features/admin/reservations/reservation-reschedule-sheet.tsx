"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Link2, MessageCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { adminRequestHeader, adminRequestValue } from "@/lib/auth/session-policy"
import { zoneConfig } from "@/lib/reservations/configuration"
import { trackingHref } from "@/lib/reservations/tracking-link"
import { normalizeChileMobile } from "@/lib/reservations/validation"
import type { ReservationZone } from "@/lib/reservations/types"

type ReservationRescheduleSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  id: string
  revision: number
  referenceCode: string
  customerName: string
  partySize: number
  date: string
  time: string
  zone: ReservationZone
}

const fieldClass = "h-11 w-full min-w-0 max-w-full rounded-xl border border-input bg-cream px-3 text-base"

function absoluteTrackingHref(token: string) {
  const path = trackingHref(token)
  if (typeof window === "undefined") return path
  return new URL(path, window.location.origin).href
}

function whatsappHref(phone: string, name: string, url: string) {
  const digits = phone.replace(/\D/g, "")
  const text = `Hola ${name.trim()}, reagendamos tu reserva en PIÙ. Quedó pendiente de confirmación. Puedes ver el estado aquí: ${url}`
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

function ReservationRescheduleSheet({
  open,
  onOpenChange,
  id,
  revision,
  referenceCode,
  customerName,
  partySize,
  date,
  time,
  zone,
}: ReservationRescheduleSheetProps) {
  const router = useRouter()
  const [visitDate, setVisitDate] = useState(date)
  const [visitTime, setVisitTime] = useState(time)
  const [visitZone, setVisitZone] = useState<ReservationZone>(zone)
  const [phone, setPhone] = useState("")
  const [currentRevision, setCurrentRevision] = useState(revision)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const [link, setLink] = useState("")
  const [copied, setCopied] = useState(false)
  const resetKey = open ? `${id}|${revision}|${date}|${time}|${zone}` : ""
  const [appliedKey, setAppliedKey] = useState(resetKey)
  if (resetKey !== appliedKey) {
    setAppliedKey(resetKey)
    if (resetKey) {
      setVisitDate(date)
      setVisitTime(time)
      setVisitZone(zone)
      setCurrentRevision(revision)
      setPhone("")
      setSaved(false)
      setLink("")
      setError("")
      setCopied(false)
    }
  }

  useEffect(() => {
    if (!open) return
    let active = true
    void fetch(`/api/admin/reservations/${id}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null
        return (await response.json()) as { reservation?: { customerPhone?: string; revision?: number } }
      })
      .then((body) => {
        if (!active || !body?.reservation) return
        if (typeof body.reservation.customerPhone === "string") setPhone(body.reservation.customerPhone)
        if (typeof body.reservation.revision === "number") setCurrentRevision(body.reservation.revision)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [open, id, revision, date, time, zone])

  async function save() {
    setPending(true)
    setError("")
    try {
      const response = await fetch(`/api/admin/reservations/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", [adminRequestHeader]: adminRequestValue },
        body: JSON.stringify({
          action: "reschedule",
          revision: currentRevision,
          proposedDate: visitDate,
          proposedTime: visitTime,
          proposedZone: visitZone,
          reason: "",
        }),
      })
      const body = (await response.json().catch(() => null)) as { message?: string; trackingToken?: string } | null
      if (!response.ok) {
        setError(body?.message || "No se pudo reagendar.")
        return
      }
      setLink(typeof body?.trackingToken === "string" ? absoluteTrackingHref(body.trackingToken) : "")
      setSaved(true)
      router.refresh()
    } catch {
      setError("No se pudo reagendar. Revisa la solicitud otra vez.")
    } finally {
      setPending(false)
    }
  }

  async function copyLink() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      setCopied(false)
      setError("No se pudo copiar. Selecciona el enlace y cópialo a mano.")
    }
  }

  const mobile = normalizeChileMobile(phone)
  const sendHref = saved && link && mobile ? whatsappHref(mobile, customerName, link) : ""

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85dvh] w-full min-w-0 max-w-full overflow-x-hidden overflow-y-auto rounded-t-2xl pb-safe">
        <SheetHeader>
          <SheetTitle>Reagendar</SheetTitle>
          <SheetDescription>
            {customerName} · {partySize} {partySize === 1 ? "persona" : "personas"} · {referenceCode}. Al guardar queda pendiente de confirmación.
          </SheetDescription>
        </SheetHeader>
        {saved ? (
          <div className="flex flex-col gap-3 px-4">
            <p className="rounded-xl bg-status-waiting-soft px-4 py-3 text-sm font-semibold text-status-waiting">
              La visita quedó para el {visitDate} a las {visitTime}. El cliente la verá pendiente, sin confirmar.
            </p>
            {link ? (
              <>
                <p className="text-sm break-all text-olive-strong">{link}</p>
                <Button type="button" variant="secondary" className="h-12" onClick={() => void copyLink()}>
                  {copied ? <Check aria-hidden /> : <Link2 aria-hidden />}
                  {copied ? "Enlace copiado" : "Copiar enlace de estado"}
                </Button>
                {sendHref ? (
                  <Button asChild className="h-12">
                    <a href={sendHref} target="_blank" rel="noopener noreferrer">
                      <MessageCircle aria-hidden />
                      Enviar enlace al cliente
                    </a>
                  </Button>
                ) : (
                  <p className="text-sm text-olive-muted">Esta reserva no tiene un celular chileno. Copia el enlace y envíaselo por otro medio.</p>
                )}
              </>
            ) : (
              <p className="text-sm text-olive-muted">La reagenda se guardó. El enlace de estado no se pudo generar; puedes crearlo desde el detalle de la reserva.</p>
            )}
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-3 px-4">
            <label className="flex min-w-0 flex-col gap-1 text-sm font-semibold text-olive">
              Día
              <Input type="date" value={visitDate} onChange={(event) => setVisitDate(event.target.value)} aria-label="Día de la reserva" className="bg-cream" />
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-sm font-semibold text-olive">
              Hora
              <Input type="time" value={visitTime} onChange={(event) => setVisitTime(event.target.value)} aria-label="Hora de la reserva" className="bg-cream" />
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-sm font-semibold text-olive">
              Zona
              <select value={visitZone} onChange={(event) => setVisitZone(event.target.value === "terrace" ? "terrace" : "salon")} aria-label="Zona de la reserva" className={fieldClass}>
                <option value="salon">{zoneConfig("salon").label}</option>
                <option value="terrace">{zoneConfig("terrace").label}</option>
              </select>
            </label>
          </div>
        )}
        {error ? (
          <p role="alert" className="px-4 text-sm font-semibold text-status-closed">
            {error}
          </p>
        ) : null}
        <SheetFooter>
          {saved ? (
            <Button type="button" variant="secondary" className="h-12" onClick={() => onOpenChange(false)}>
              Listo
            </Button>
          ) : (
            <Button type="button" className="h-12" disabled={pending || !visitDate || !visitTime} onClick={() => void save()}>
              Guardar reagendación
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export { ReservationRescheduleSheet }
