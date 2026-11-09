"use client"

import { useState } from "react"
import { Check, Copy, Link2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { trackingHref } from "@/lib/reservations/tracking-link"

function absoluteTrackingHref(token: string) {
  const path = trackingHref(token)
  if (typeof window === "undefined") return path
  return new URL(path, window.location.origin).href
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function useCopied() {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle")
  async function copy(text: string) {
    const ok = await copyText(text)
    setState(ok ? "copied" : "failed")
    if (ok) window.setTimeout(() => setState("idle"), 2200)
  }
  return { state, copy }
}

/** Referencia visible con botón para copiarla. No abre el seguimiento. */
function ReservationReference({ code, size = "lg" }: { code: string; size?: "lg" | "md" }) {
  const { state, copy } = useCopied()
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-olive px-4 py-3 text-cream shadow-tactile">
      <div className="min-w-0">
        <p className="font-label text-[0.625rem] tracking-[0.18em] text-cream/70 uppercase">Referencia</p>
        <p
          className={
            size === "lg"
              ? "font-heading text-[1.75rem] leading-tight font-extrabold tracking-wider"
              : "font-heading text-2xl leading-tight font-extrabold tracking-wider"
          }
        >
          {code}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="rounded-full border border-cream/25 text-cream hover:bg-cream/10 focus-visible:outline-cream"
        aria-label={state === "copied" ? "Referencia copiada" : `Copiar ${code}`}
        onClick={() => void copy(code)}
      >
        {state === "copied" ? <Check aria-hidden className="size-5" /> : <Copy aria-hidden className="size-5" />}
      </Button>
      <span className="sr-only" aria-live="polite">
        {state === "copied" ? "Referencia copiada" : ""}
      </span>
    </div>
  )
}

/** Abre el seguimiento y copia el enlace privado sin mostrarlo entero. */
function CopyTrackingLink({ token }: { token: string }) {
  const { state, copy } = useCopied()
  return (
    <div className="flex flex-col gap-2">
      <Button asChild variant="accent" size="lg" className="w-full">
        <a href={trackingHref(token)}>Ver estado de mi reserva</a>
      </Button>
      <Button type="button" variant="secondary" size="lg" className="w-full" onClick={() => void copy(absoluteTrackingHref(token))}>
        {state === "copied" ? <Check aria-hidden /> : <Link2 aria-hidden />}
        {state === "copied" ? "Enlace copiado" : "Copiar enlace"}
      </Button>
      <p className="min-h-5 text-center text-xs text-olive-muted" aria-live="polite">
        {state === "failed" ? "No se pudo copiar. Abre «Ver estado» y guarda esa página." : "Guarda el enlace: es tu acceso privado."}
      </p>
    </div>
  )
}

export { CopyTrackingLink, ReservationReference }
