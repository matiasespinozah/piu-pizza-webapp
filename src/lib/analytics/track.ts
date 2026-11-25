import { analyticsActive, consentDefault, googleSignals, measurementId, trackablePath } from "@/lib/analytics/config"
import type { AnalyticsEvent } from "@/lib/analytics/events"

/** Solo navegador. Envía a la cola de Google Analytics; si el script aún no cargó, el evento espera ahí. */

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

let initialized = false

function ensureGtag() {
  window.dataLayer = window.dataLayer || []
  if (!window.gtag) {
    window.gtag = function gtag() {
      // gtag.js exige el objeto `arguments`, no un arreglo.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments)
    }
  }
  return window.gtag
}

/** El interruptor oficial de Google: con `true` no se envía nada de esta propiedad, ni siquiera lo automático. */
function setCollection(enabled: boolean) {
  ;(window as unknown as Record<string, boolean>)[`ga-disable-${measurementId}`] = !enabled
}

/** Orden obligatorio: consentimiento → fecha → configuración. Sin `send_page_view`: las páginas vistas las envía el sitio. */
function initAnalytics() {
  if (!analyticsActive || initialized) return
  initialized = true
  const gtag = ensureGtag()
  gtag("consent", "default", consentDefault)
  gtag("js", new Date())
  gtag("config", measurementId, {
    send_page_view: false,
    allow_google_signals: googleSignals,
    allow_ad_personalization_signals: false,
    cookie_flags: "SameSite=Lax;Secure",
  })
}

function trackEvent(event: AnalyticsEvent | null) {
  if (!event || !analyticsActive || typeof window === "undefined") return
  const allowed = trackablePath(window.location.pathname)
  setCollection(allowed)
  if (!allowed) return
  initAnalytics()
  ensureGtag()("event", event.name, event.params)
}

export { initAnalytics, setCollection, trackEvent }
