const emailMaxLength = 120

type EmailResult = { email: string } | { error: string }

function normalizeReservationEmail(value: string): EmailResult {
  const email = value.trim().toLowerCase()
  if (!email) return { error: "Escribe tu correo." }
  if (email.length > emailMaxLength) return { error: "El correo es demasiado largo." }
  const parts = email.split("@")
  const domain = parts[1]
  if (
    parts.length !== 2 ||
    !parts[0] ||
    !domain ||
    !domain.includes(".") ||
    domain.startsWith(".") ||
    domain.endsWith(".") ||
    domain.includes("..") ||
    email.includes(" ")
  ) {
    return { error: "Revisa el correo. Tiene que verse como nombre@correo.cl." }
  }
  return { email }
}

function optionalReservationEmail(value: string): { email: string | null } | { error: string } {
  if (!value.trim()) return { email: null }
  return normalizeReservationEmail(value)
}

function storedReservationEmail(value: unknown) {
  if (typeof value !== "string") return null
  const parsed = normalizeReservationEmail(value)
  return "email" in parsed ? parsed.email : null
}

function nextRequestCount(current: unknown) {
  const count = typeof current === "number" && Number.isInteger(current) && current > 0 ? current : 0
  return count + 1
}

type GuestPlan =
  | { action: "duplicate" }
  | { action: "conflict" }
  | { action: "create"; requestCount: number | null }

function planReservationCreate(existing: boolean, sameFingerprint: boolean, email: string | null, currentCount: unknown): GuestPlan {
  if (existing) return sameFingerprint ? { action: "duplicate" } : { action: "conflict" }
  if (!email) return { action: "create", requestCount: null }
  return { action: "create", requestCount: nextRequestCount(currentCount) }
}

function requestCountLabel(count: number) {
  return count === 1 ? "1 solicitud realizada" : `${count} solicitudes realizadas`
}

export {
  emailMaxLength,
  nextRequestCount,
  normalizeReservationEmail,
  optionalReservationEmail,
  planReservationCreate,
  requestCountLabel,
  storedReservationEmail,
}
