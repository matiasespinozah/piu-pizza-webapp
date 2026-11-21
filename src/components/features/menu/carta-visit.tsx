"use client"

import { useEffect } from "react"

const visibleBeforeCountMs = 1000

function send(body: { kind: "open" } | { kind: "time"; seconds: number }) {
  const payload = JSON.stringify(body)
  try {
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" })
      if (navigator.sendBeacon("/api/carta/visita", blob)) return
    }
  } catch {
    // Sigue el fetch de abajo.
  }
  void fetch("/api/carta/visita", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => undefined)
}

/** Cuenta la carta recién cuando está visible. No bloquea el render ni guarda cookies. */
function CartaVisitMeter() {
  useEffect(() => {
    let openTimer = 0
    let opened = false
    let visibleSince = 0

    function flush() {
      if (openTimer) {
        window.clearTimeout(openTimer)
        openTimer = 0
      }
      if (!visibleSince) return
      const seconds = Math.min(1800, Math.round((Date.now() - visibleSince) / 1000))
      visibleSince = 0
      if (seconds >= 1) send({ kind: "time", seconds })
    }

    function arm() {
      if (document.visibilityState !== "visible") return
      if (!visibleSince) visibleSince = Date.now()
      if (opened || openTimer) return
      openTimer = window.setTimeout(() => {
        openTimer = 0
        if (document.visibilityState !== "visible") return
        opened = true
        send({ kind: "open" })
      }, visibleBeforeCountMs)
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") flush()
      else arm()
    }

    arm()
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("pagehide", flush)
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("pagehide", flush)
      flush()
    }
  }, [])

  return null
}

export { CartaVisitMeter }
