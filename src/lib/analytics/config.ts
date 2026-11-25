/**
 * Google Analytics 4 (la propiedad de Firebase Analytics de `piu-pizza-cl`).
 * Ver docs/arquitectura/analitica.md: qué se mide, qué no, y cómo cambiar el consentimiento.
 */

/** ID de medición (público, como el resto de la config web de Firebase). Vacío: no se carga nada. */
const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?.trim() ?? ""

/** Solo en producción y con un ID válido. En desarrollo y en los tests no se envía nada. */
const analyticsActive = process.env.NODE_ENV === "production" && /^G-[A-Z0-9]{6,}$/.test(measurementId)

/**
 * Consentimiento que se declara al cargar. Hoy: medición básica (cookies de analítica) y SIN publicidad.
 * Para pedir consentimiento a futuro: `analytics_storage: "denied"` y llamar a `gtag("consent", "update", …)`
 * desde un aviso. Es el único lugar que hay que cambiar.
 */
const consentDefault = {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "granted",
} as const

/**
 * Edad, género e intereses de Google. Necesita las señales de Google (Google Signals) y exige conceder
 * `ad_user_data` y `ad_personalization`, o sea cookies de publicidad. Está APAGADO a propósito: encenderlo es una
 * decisión del dueño. Además se activa en GA (Admin → Configuración de datos → Recopilación de datos).
 */
const googleSignals = false

/** Rutas donde NO se mide nada: panel, APIs, seguimiento de reservas (lleva un código secreto en la URL) y dev. */
const excludedPrefixes = ["/admin", "/api", "/reservas/estado", "/correo", "/ui"] as const

function trackablePath(pathname: string | null | undefined) {
  if (!pathname || !pathname.startsWith("/")) return false
  return !excludedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export { analyticsActive, consentDefault, excludedPrefixes, googleSignals, measurementId, trackablePath }
