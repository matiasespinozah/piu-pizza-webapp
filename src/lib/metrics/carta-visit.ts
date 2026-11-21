const maxStaySeconds = 30 * 60

type CartaVisit = { kind: "open" } | { kind: "time"; seconds: number }

type CartaTotals = { opens: number; engagedSeconds: number }

function readCartaBeacon(value: unknown): CartaVisit | null {
  if (!value || typeof value !== "object") return null
  const body = value as { kind?: unknown; seconds?: unknown }
  if (body.kind === "open") return { kind: "open" }
  if (body.kind !== "time") return null
  if (typeof body.seconds !== "number" || !Number.isInteger(body.seconds)) return null
  if (body.seconds < 1 || body.seconds > maxStaySeconds) return null
  return { kind: "time", seconds: body.seconds }
}

function sameSiteOrigin(origin: string | null, host: string | null) {
  if (!origin || !host) return false
  try {
    return new URL(origin).host.toLowerCase() === host.split(",")[0].trim().toLowerCase()
  } catch {
    return false
  }
}

function isLikelyBot(userAgent: string | null) {
  if (!userAgent) return false
  return /bot|spider|crawler|headless|preview|facebookexternalhit|whatsapp/i.test(userAgent)
}

function applyCartaVisit(totals: CartaTotals, visit: CartaVisit): CartaTotals {
  if (visit.kind === "open") return { ...totals, opens: totals.opens + 1 }
  return { ...totals, engagedSeconds: totals.engagedSeconds + visit.seconds }
}

function averageStaySeconds(opens: number, engagedSeconds: number) {
  if (opens <= 0 || engagedSeconds <= 0) return 0
  return Math.round(engagedSeconds / opens)
}

export { applyCartaVisit, averageStaySeconds, isLikelyBot, maxStaySeconds, readCartaBeacon, sameSiteOrigin }
export type { CartaTotals, CartaVisit }
