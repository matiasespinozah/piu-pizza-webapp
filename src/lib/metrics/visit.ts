import { maxStaySeconds } from "@/lib/metrics/carta-visit"

type VisitSurface = "home" | "carta" | "reservas"

type VisitBeacon = {
  surface: VisitSurface
  seconds: number
  reached?: true
  savedSeconds?: number
}

type VisitCounters = {
  homeOpens: number
  homeSeconds: number
  cartaOpens: number
  cartaSeconds: number
  reservationOpens: number
  reservationSeconds: number
  reservationReached: number
  reservationSaved: number
  reservationSavedSeconds: number
  reservationSavedSamples: number
}

const emptyVisitCounters: VisitCounters = {
  homeOpens: 0,
  homeSeconds: 0,
  cartaOpens: 0,
  cartaSeconds: 0,
  reservationOpens: 0,
  reservationSeconds: 0,
  reservationReached: 0,
  reservationSaved: 0,
  reservationSavedSeconds: 0,
  reservationSavedSamples: 0,
}

function wholeSeconds(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= maxStaySeconds
}

function readVisitBeacon(value: unknown): VisitBeacon | null {
  if (!value || typeof value !== "object") return null
  const body = value as { surface?: unknown; seconds?: unknown; reached?: unknown; savedSeconds?: unknown }
  if (body.surface !== "home" && body.surface !== "carta" && body.surface !== "reservas") return null
  if (!wholeSeconds(body.seconds)) return null
  const beacon: VisitBeacon = { surface: body.surface, seconds: body.seconds as number }
  if (body.reached !== undefined) {
    if (body.surface !== "reservas" || body.reached !== true) return null
    beacon.reached = true
  }
  if (body.savedSeconds !== undefined) {
    if (body.surface !== "reservas" || !wholeSeconds(body.savedSeconds)) return null
    beacon.savedSeconds = body.savedSeconds as number
  }
  return beacon
}

function applyVisit(totals: VisitCounters, beacon: VisitBeacon): VisitCounters {
  if (beacon.surface === "home") {
    return { ...totals, homeOpens: totals.homeOpens + 1, homeSeconds: totals.homeSeconds + beacon.seconds }
  }
  if (beacon.surface === "carta") {
    return { ...totals, cartaOpens: totals.cartaOpens + 1, cartaSeconds: totals.cartaSeconds + beacon.seconds }
  }
  return {
    ...totals,
    reservationOpens: totals.reservationOpens + 1,
    reservationSeconds: totals.reservationSeconds + beacon.seconds,
    reservationReached: totals.reservationReached + (beacon.reached ? 1 : 0),
    reservationSavedSeconds: totals.reservationSavedSeconds + (beacon.savedSeconds ?? 0),
    reservationSavedSamples: totals.reservationSavedSamples + (beacon.savedSeconds ? 1 : 0),
  }
}

function applyReservationSaved(totals: VisitCounters): VisitCounters {
  return { ...totals, reservationSaved: totals.reservationSaved + 1 }
}

export { applyReservationSaved, applyVisit, emptyVisitCounters, readVisitBeacon }
export type { VisitBeacon, VisitCounters, VisitSurface }
