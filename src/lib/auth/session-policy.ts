/** Nombre compartido con el Hito 04. El navegador no puede leerla: es httpOnly. */
const sessionCookieName = "piu_session"

/**
 * El panel maneja datos del equipo. Ocho horas obligan a volver a entrar
 * en un turno largo. Firebase no emite cookies de menos de cinco minutos.
 */
const sessionMaxAgeMs = 8 * 60 * 60 * 1000

/** El token con el que se crea la cookie tiene que ser de un ingreso recién hecho. */
const authTimeMaxAgeSeconds = 5 * 60

const adminRequestHeader = "x-piu-requested-with"
const adminRequestValue = "admin-login"

function authTimeIsFresh(authTimeSeconds: unknown, nowMs = Date.now()) {
  if (typeof authTimeSeconds !== "number" || !Number.isFinite(authTimeSeconds)) return false
  const ageSeconds = nowMs / 1000 - authTimeSeconds
  return ageSeconds >= -5 && ageSeconds <= authTimeMaxAgeSeconds
}

function sessionIsExpired(expSeconds: unknown, nowMs = Date.now()) {
  if (typeof expSeconds !== "number" || !Number.isFinite(expSeconds)) return true
  return expSeconds * 1000 <= nowMs
}

/**
 * POST y DELETE del ingreso vienen del propio sitio y de nuestro formulario.
 * El navegador no deja que otra página falsifique Origin ni este encabezado.
 */
function requestIsTrusted(input: {
  origin: string | null
  host: string | null
  forwardedHost: string | null
  requestedWith: string | null
}) {
  if (input.requestedWith !== adminRequestValue) return false
  if (!input.origin) return false

  let originHost = ""
  try {
    const url = new URL(input.origin)
    if (url.protocol !== "https:" && url.protocol !== "http:") return false
    originHost = url.host.toLowerCase()
  } catch {
    return false
  }

  const forwarded = input.forwardedHost?.split(",")[0]?.trim().toLowerCase() ?? ""
  const expected = forwarded || input.host?.toLowerCase() || ""
  return expected.length > 0 && originHost === expected
}

/** No hay `?next=`. Un parámetro de URL no puede sacar al personal del panel. */
function safeAdminRedirect(candidate?: unknown) {
  if (candidate != null) return "/admin"
  return "/admin"
}

export {
  adminRequestHeader,
  adminRequestValue,
  authTimeIsFresh,
  authTimeMaxAgeSeconds,
  requestIsTrusted,
  safeAdminRedirect,
  sessionCookieName,
  sessionIsExpired,
  sessionMaxAgeMs,
}
