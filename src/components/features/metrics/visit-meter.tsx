"use client"

import { useEffect, useRef, useSyncExternalStore } from "react"

import { maxStaySeconds } from "@/lib/metrics/carta-visit"
import type { VisitBeacon, VisitSurface } from "@/lib/metrics/visit"

const maxStayMs = maxStaySeconds * 1000

function send(body: VisitBeacon) {
  const payload = JSON.stringify(body)
  try {
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" })
      if (navigator.sendBeacon("/api/visitas", blob)) return
    }
  } catch {
    // Sigue el fetch de abajo.
  }
  void fetch("/api/visitas", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => undefined)
}

/**
 * Una sola escritura al salir de la página. El reloj se pausa si la pestaña
 * queda atrás y no guarda cookie ni identificador.
 */
function useVisitMeter(surface: VisitSurface, detail?: { reached?: boolean; saved?: boolean }) {
  const saved = detail?.saved === true
  const savedSecondsRef = useRef(0)
  const clock = useRef({ accumulated: 0, visibleSince: 0 })

  useEffect(() => {
    if (surface !== "reservas" || !reservationProgress.saved || savedSecondsRef.current > 0) return
    const live = clock.current.visibleSince ? Date.now() - clock.current.visibleSince : 0
    const seconds = Math.min(maxStaySeconds, Math.round((clock.current.accumulated + live) / 1000))
    if (seconds >= 1) savedSecondsRef.current = seconds
  }, [surface, saved])

  useEffect(() => {
    let sent = false
    const node = clock.current

    function pause() {
      if (!node.visibleSince) return
      node.accumulated += Date.now() - node.visibleSince
      node.visibleSince = 0
      if (node.accumulated > maxStayMs) node.accumulated = maxStayMs
    }

    function arm() {
      if (document.visibilityState !== "visible") return
      if (!node.visibleSince) node.visibleSince = Date.now()
    }

    function flush() {
      if (sent) return
      pause()
      const seconds = Math.min(maxStaySeconds, Math.round(node.accumulated / 1000))
      if (seconds < 1) return
      sent = true
      const body: VisitBeacon = { surface, seconds }
      if (surface === "reservas" && reservationProgress.reached) body.reached = true
      if (surface === "reservas" && savedSecondsRef.current >= 1) body.savedSeconds = savedSecondsRef.current
      send(body)
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") pause()
      else arm()
    }

    function onPageShow(event: PageTransitionEvent) {
      if (!event.persisted) return
      sent = false
      node.accumulated = 0
      node.visibleSince = 0
      savedSecondsRef.current = 0
      arm()
    }

    arm()
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("pagehide", flush)
    window.addEventListener("pageshow", onPageShow)
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("pagehide", flush)
      window.removeEventListener("pageshow", onPageShow)
      flush()
    }
  }, [surface])
}

function VisitMeter({ surface }: { surface: VisitSurface }) {
  useVisitMeter(surface)
  return null
}

type ReservationProgress = { reached: boolean; saved: boolean }

let reservationProgress: ReservationProgress = { reached: false, saved: false }
const reservationListeners = new Set<() => void>()

function resetReservationProgress() {
  reservationProgress = { reached: false, saved: false }
}

function noteReservationProgress(next: ReservationProgress) {
  const reached = reservationProgress.reached || next.reached
  const saved = reservationProgress.saved || next.saved
  if (reached === reservationProgress.reached && saved === reservationProgress.saved) return
  reservationProgress = { reached, saved }
  reservationListeners.forEach((listener) => listener())
}

function useReservationProgress() {
  return useSyncExternalStore(
    (listener) => {
      reservationListeners.add(listener)
      return () => reservationListeners.delete(listener)
    },
    () => reservationProgress,
    () => reservationProgress
  )
}

/** Vive fuera del formulario, que se monta otra vez al terminar de cargar. */
function ReservationVisitMeter() {
  const progress = useReservationProgress()
  useEffect(() => {
    resetReservationProgress()
    return () => resetReservationProgress()
  }, [])
  useVisitMeter("reservas", progress)
  return null
}

export { noteReservationProgress, ReservationVisitMeter, VisitMeter }
