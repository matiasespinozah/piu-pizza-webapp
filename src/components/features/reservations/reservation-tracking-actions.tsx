"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { trackingHref } from "@/lib/reservations/tracking-link"

function absoluteTrackingHref(token: string) {
  const path = trackingHref(token)
  if (typeof window === "undefined") return path
  return new URL(path, window.location.origin).href
}

function CopyTrackingLink({ token }: { token: string }) {
  const href = absoluteTrackingHref(token)
  const [copied, setCopied] = useState(false)
  const [manual, setManual] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(href)
      setCopied(true)
      setManual(false)
    } catch {
      setCopied(false)
      setManual(true)
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="text-sm text-olive-strong">
        Guarda este enlace para revisar el estado de tu solicitud cuando quieras. No lo compartas con otras personas.
      </p>
      <Input readOnly value={href} aria-label="Enlace de seguimiento" className="font-label text-sm" onFocus={(event) => event.currentTarget.select()} />
      <Button type="button" variant="secondary" className="h-12 w-full" onClick={() => void copy()}>
        {copied ? "Enlace copiado" : "Copiar enlace de seguimiento"}
      </Button>
      {manual ? <p className="text-sm text-olive-strong">No se pudo copiar solo. Selecciona el enlace y cópialo a mano.</p> : null}
      <Button asChild variant="accent" className="h-12 w-full">
        <a href={trackingHref(token)} rel="noreferrer">
          Consultar estado
        </a>
      </Button>
    </div>
  )
}

export { CopyTrackingLink }
