"use client"

import { Suspense, useEffect } from "react"
import { usePathname } from "next/navigation"
import { useReportWebVitals } from "next/web-vitals"
import Script from "next/script"

import { analyticsActive, measurementId, trackablePath } from "@/lib/analytics/config"
import { exceptionEvent, linkEvent, webVitalEvent } from "@/lib/analytics/events"
import { initAnalytics, setCollection, trackEvent } from "@/lib/analytics/track"

/** Errores que no dicen nada: extensiones del navegador y un aviso inofensivo de ResizeObserver. */
const noise = /^(script error\.?|resizeobserver loop)/i

function AnalyticsRuntime() {
  const pathname = usePathname()
  const allowed = trackablePath(pathname)

  // Apaga todo en el panel y en el seguimiento de reservas; en el resto, envía la página vista.
  useEffect(() => {
    setCollection(allowed)
    if (!allowed) return
    initAnalytics()
    // El título se actualiza al terminar la navegación.
    const timer = window.setTimeout(() => {
      trackEvent({ name: "page_view", params: { page_path: pathname, page_title: document.title.slice(0, 100) } })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [allowed, pathname])

  // Clics en WhatsApp, mapa, redes y «Mi reserva». Sin la URL: puede llevar un texto o un código.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null
      if (!anchor) return
      const area =
        anchor.closest("[data-analytics-area]")?.getAttribute("data-analytics-area") ??
        (anchor.closest("header") ? "encabezado" : anchor.closest("footer") ? "pie" : "contenido")
      trackEvent(linkEvent(anchor.href, area))
    }
    document.addEventListener("click", onClick, { capture: true, passive: true })
    return () => document.removeEventListener("click", onClick, { capture: true })
  }, [])

  // Errores de JavaScript en el navegador de quien visita, como mucho 5 por página.
  useEffect(() => {
    let sent = 0
    function report(message: string) {
      if (sent >= 5 || !message || noise.test(message)) return
      sent += 1
      trackEvent(exceptionEvent(message, window.location.pathname))
    }
    const onError = (event: ErrorEvent) => report(event.message)
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as { message?: unknown } | string | undefined
      report(typeof reason === "string" ? reason : String(reason?.message ?? "unhandledrejection"))
    }
    window.addEventListener("error", onError)
    window.addEventListener("unhandledrejection", onRejection)
    return () => {
      window.removeEventListener("error", onError)
      window.removeEventListener("unhandledrejection", onRejection)
    }
  }, [])

  // Rendimiento real de quien visita (LCP, CLS, INP, FCP, TTFB).
  useReportWebVitals((metric) => {
    trackEvent(webVitalEvent(metric))
  })

  // El script de Google se pide al terminar de cargar la página y solo si la ruta se puede medir.
  return allowed ? <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="lazyOnload" /> : null
}

/**
 * Google Analytics 4. No hace nada sin ID de medición o fuera de producción.
 * Ver docs/arquitectura/analitica.md.
 */
function Analytics() {
  if (!analyticsActive) return null
  return (
    <Suspense fallback={null}>
      <AnalyticsRuntime />
    </Suspense>
  )
}

export { Analytics }
