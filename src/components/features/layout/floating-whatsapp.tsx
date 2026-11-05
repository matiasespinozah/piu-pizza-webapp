"use client"

import * as React from "react"
import { XIcon } from "lucide-react"

import { whatsappHref } from "@/lib/site"

const dismissKey = "piu-whatsapp-help-dismissed"
const showAfterMs = 90_000
const visibleMs = 5_000

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.5 2 2 6.48 2 12.02c0 1.77.46 3.5 1.34 5.02L2 22l5.1-1.34A10 10 0 0 0 12.04 22h.01c5.54 0 10.04-4.48 10.04-10.02 0-2.67-1.04-5.18-2.94-7.07M12.05 20.15h-.01a8.16 8.16 0 0 1-4.16-1.14l-.3-.18-3.02.8.81-2.95-.2-.3a8.18 8.18 0 0 1-1.26-4.36c0-4.52 3.7-8.2 8.24-8.2a8.17 8.17 0 0 1 8.22 8.21c0 4.52-3.7 8.2-8.22 8.2m4.52-6.14c-.25-.12-1.46-.72-1.69-.8-.22-.08-.39-.12-.55.12-.17.25-.64.8-.78.97-.14.16-.29.18-.53.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.7-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.08-.12-.55-1.34-.76-1.83-.2-.48-.4-.41-.55-.42l-.47-.01c-.17 0-.43.06-.66.31-.22.25-.86.84-.86 2.05s.88 2.38 1 2.55c.12.16 1.74 2.66 4.21 3.73.59.25 1.05.4 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.46-.6 1.67-1.17.2-.58.2-1.07.14-1.17-.06-.1-.22-.16-.47-.29"
      />
    </svg>
  )
}

function FloatingWhatsApp() {
  const [bubble, setBubble] = React.useState(false)
  const dismissed = React.useRef(false)
  const phase = React.useRef<"wait" | "show">("wait")
  const showTimer = React.useRef(0)
  const hideTimer = React.useRef(0)
  const remaining = React.useRef(showAfterMs)
  const markedAt = React.useRef(0)

  const clearTimers = React.useCallback(() => {
    window.clearTimeout(showTimer.current)
    window.clearTimeout(hideTimer.current)
  }, [])

  const hideBubble = React.useCallback(() => {
    setBubble(false)
  }, [])

  const dismissForever = React.useCallback(() => {
    dismissed.current = true
    sessionStorage.setItem(dismissKey, "1")
    hideBubble()
    clearTimers()
  }, [clearTimers, hideBubble])

  React.useEffect(() => {
    if (sessionStorage.getItem(dismissKey)) {
      dismissed.current = true
      return
    }

    function armShow(delay: number) {
      clearTimers()
      phase.current = "wait"
      remaining.current = delay
      markedAt.current = Date.now()
      showTimer.current = window.setTimeout(() => {
        if (dismissed.current || document.hidden) return
        phase.current = "show"
        setBubble(true)
        markedAt.current = Date.now()
        remaining.current = visibleMs
        hideTimer.current = window.setTimeout(() => {
          setBubble(false)
          armShow(showAfterMs)
        }, visibleMs)
      }, delay)
    }

    function onVisibility() {
      if (dismissed.current) return
      if (document.hidden) {
        const elapsed = Date.now() - markedAt.current
        remaining.current =
          phase.current === "show" ? showAfterMs : Math.max(0, remaining.current - elapsed)
        phase.current = "wait"
        clearTimers()
        setBubble(false)
        return
      }
      armShow(remaining.current || showAfterMs)
    }

    armShow(showAfterMs)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      clearTimers()
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [clearTimers])

  return (
    <div className="pointer-events-none fixed right-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-30 flex flex-col items-end gap-2 sm:right-6">
      {bubble ? (
        <div
          role="status"
          className="pointer-events-auto flex max-w-[13.5rem] items-start gap-1 rounded-xl bg-cream py-2 ps-3 pe-1 text-olive shadow-lift motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300"
        >
          <p className="pt-1.5 text-sm leading-5 font-medium">¿Necesitas ayuda?</p>
          <button
            type="button"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-olive outline-none hover:bg-olive-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
            aria-label="Cerrar aviso de ayuda"
            onClick={dismissForever}
          >
            <XIcon className="size-3.5" aria-hidden />
          </button>
        </div>
      ) : null}

      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Escribir a PIÙ por WhatsApp"
        onClick={hideBubble}
        className="pointer-events-auto inline-flex size-14 items-center justify-center rounded-full text-white shadow-lift outline-none transition-[transform,filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-olive motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500"
        style={{ backgroundColor: "#25D366" }}
      >
        <WhatsAppGlyph className="size-7" />
      </a>
    </div>
  )
}

export { FloatingWhatsApp }
