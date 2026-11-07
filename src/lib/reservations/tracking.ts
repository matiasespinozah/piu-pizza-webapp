import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

import { reservationConfig } from "@/lib/reservations/configuration"
import { todayIsoInSantiago } from "@/lib/reservations/schedule"
import { trackingTokenLength } from "@/lib/reservations/tracking-link"

const trackingLimits = {
  checksPerTokenPerHour: 30,
  failuresPerAddressPerHour: 40,
  maxCredentialLength: 500,
  maxBodyLength: 2000,
}

function addCivilDays(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

/** El enlace vale el día de la visita y los días de gracia que siguen. */
function trackingExpiresOn(visitDate: string) {
  return addCivilDays(visitDate, reservationConfig.trackingLinkGraceDays)
}

function trackingExpired(expiresOn: string, now = new Date()) {
  return todayIsoInSantiago(now) > expiresOn
}

function createTrackingSecret() {
  return randomBytes(32).toString("base64url")
}

function hashTrackingSecret(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

function wrapKey(idempotencyKey: string) {
  return createHash("sha256").update(`piu-tracking-v1|${idempotencyKey}`).digest()
}

/** Cifra el secreto para poder repetir la misma respuesta si se pierde. No es el secreto en claro. */
function wrapTrackingSecret(token: string, idempotencyKey: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", wrapKey(idempotencyKey), iv)
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url")
}

function unwrapTrackingSecret(payload: string, idempotencyKey: string) {
  try {
    const buffer = Buffer.from(payload, "base64url")
    if (buffer.length < 29) return null
    const decipher = createDecipheriv("aes-256-gcm", wrapKey(idempotencyKey), buffer.subarray(0, 12))
    decipher.setAuthTag(buffer.subarray(12, 28))
    const token = Buffer.concat([decipher.update(buffer.subarray(28)), decipher.final()]).toString("utf8")
    return token.length === trackingTokenLength ? token : null
  } catch {
    return null
  }
}

export {
  createTrackingSecret,
  hashTrackingSecret,
  trackingExpired,
  trackingExpiresOn,
  trackingLimits,
  unwrapTrackingSecret,
  wrapTrackingSecret,
}
