import { createHash, randomBytes } from "node:crypto"

/** El enlace caduca a las 48 horas. No se renueva solo. */
const inviteLifetimeMs = 48 * 60 * 60 * 1000

const inviteTokenPattern = /^[A-Za-z0-9_-]{43,128}$/

type InvitationPhase = "pending" | "used" | "expired" | "revoked"

type InviteFailure =
  | "invalid"
  | "expired"
  | "used"
  | "revoked"
  | "mismatch"
  | "exists"
  | "sign-in"
  | "identity"
  | "disabled"
  | "busy"
  | "rate"
  | "unavailable"

function createInviteToken() {
  return randomBytes(32).toString("base64url")
}

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

function hashInviteBucket(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function normalizeStaffEmail(value: string) {
  return value.trim().toLowerCase()
}

function staffEmailIsValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 120
}

function invitationPhase(status: "open" | "used" | "revoked", expiresAt: string, now: number): InvitationPhase {
  if (status === "used") return "used"
  if (status === "revoked") return "revoked"
  const expires = Date.parse(expiresAt)
  if (!Number.isFinite(expires) || expires <= now) return "expired"
  return "pending"
}

function inviteFailureMessage(code: InviteFailure) {
  if (code === "expired") return "Esta invitación venció."
  if (code === "used") return "Esta invitación ya fue utilizada."
  if (code === "revoked") return "Esta invitación fue revocada."
  if (code === "mismatch") return "El correo no corresponde a la invitación."
  if (code === "exists") return "Ese correo ya tiene acceso al panel."
  if (code === "sign-in") return "Esta cuenta ya existe. Entra con tu contraseña actual."
  if (code === "identity") return "No pudimos confirmar que esta cuenta sea tuya."
  if (code === "disabled") return "Esa cuenta está deshabilitada."
  if (code === "busy") return "Esta invitación se está usando. Espera un momento."
  if (code === "rate") return "Demasiados intentos. Espera un momento y vuelve a intentar."
  if (code === "unavailable") return "No pudimos completar el registro. Inténtalo de nuevo."
  return "Esta invitación no está disponible."
}

class InviteError extends Error {
  readonly code: InviteFailure

  constructor(code: InviteFailure) {
    super(inviteFailureMessage(code))
    this.name = "InviteError"
    this.code = code
  }
}

export {
  InviteError,
  createInviteToken,
  hashInviteBucket,
  hashInviteToken,
  invitationPhase,
  inviteFailureMessage,
  inviteLifetimeMs,
  inviteTokenPattern,
  normalizeStaffEmail,
  staffEmailIsValid,
}
export type { InvitationPhase, InviteFailure }
