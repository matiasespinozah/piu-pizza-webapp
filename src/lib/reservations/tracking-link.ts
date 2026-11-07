import type { ReservationStatus, ReservationZone } from "@/lib/reservations/types"

const trackingTokenLength = 43
const tokenPattern = /^[A-Za-z0-9_-]{43}$/
const referencePattern = /^PIU-[A-Z0-9]{4,16}$/i

const statuses = new Set<ReservationStatus>([
  "pending",
  "confirmed",
  "rejected",
  "reschedule_requested",
  "cancelled",
  "arrived",
  "completed",
])

type TrackingCredential =
  | { kind: "token"; token: string }
  | { kind: "reference" }
  | { kind: "malformed" }

type PublicProposal = {
  date: string | null
  time: string | null
  zone: ReservationZone | null
}

type PublicReservationStatus = {
  referenceCode: string
  status: ReservationStatus
  date: string
  time: string
  partySize: number
  zone: ReservationZone
  updatedAt: string | null
  proposal: PublicProposal | null
}

function asZone(value: unknown): ReservationZone | null {
  return value === "salon" || value === "terrace" ? value : null
}

function asText(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null
}

/**
 * Acepta el secreto o un enlace con el secreto en el fragmento.
 * Una referencia PIU-… no es credencial. Un secreto en la query tampoco.
 */
function parseTrackingCredential(raw: string): TrackingCredential {
  const value = raw.trim()
  if (!value || value.length > 500) return { kind: "malformed" }
  if (referencePattern.test(value)) return { kind: "reference" }

  let candidate = value
  if (value.includes("://") || value.startsWith("/")) {
    const hashAt = value.indexOf("#")
    if (hashAt === -1) return { kind: "malformed" }
    candidate = value.slice(hashAt + 1)
  } else if (value.includes("#")) {
    candidate = value.slice(value.indexOf("#") + 1)
  }
  candidate = candidate.trim()
  if (referencePattern.test(candidate)) return { kind: "reference" }
  try {
    candidate = decodeURIComponent(candidate)
  } catch {
    return { kind: "malformed" }
  }
  if (tokenPattern.test(candidate)) return { kind: "token", token: candidate }
  return { kind: "malformed" }
}

function trackingHref(token: string) {
  return `/reservas/estado#${token}`
}

/**
 * Arma la respuesta pública con una lista cerrada de campos.
 * Lo que no está aquí no sale, aunque el documento de Firestore lo tenga.
 */
function publicReservationStatus(data: Record<string, unknown>): PublicReservationStatus | null {
  const status = typeof data.status === "string" && statuses.has(data.status as ReservationStatus) ? (data.status as ReservationStatus) : null
  const zone = asZone(data.preferredZone)
  const partySize = typeof data.partySize === "number" && Number.isInteger(data.partySize) ? data.partySize : null
  const date = asText(data.date)
  const time = asText(data.preferredTime)
  const referenceCode = asText(data.referenceCode)
  if (!status || !zone || partySize == null || !date || !time || !referenceCode) return null

  const proposal =
    status === "reschedule_requested"
      ? {
          date: asText(data.proposedDate),
          time: asText(data.proposedTime),
          zone: asZone(data.proposedZone),
        }
      : null

  return {
    referenceCode,
    status,
    date,
    time,
    partySize,
    zone,
    updatedAt: asText(data.updatedAt),
    proposal,
  }
}

export { parseTrackingCredential, publicReservationStatus, trackingHref, trackingTokenLength }
export type { PublicReservationStatus, TrackingCredential }
