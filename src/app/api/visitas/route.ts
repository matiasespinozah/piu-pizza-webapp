import { NextResponse } from "next/server"

import { isLikelyBot, sameSiteOrigin } from "@/lib/metrics/carta-visit"
import { readVisitBeacon } from "@/lib/metrics/visit"
import { recordVisit } from "@/server/metrics/visits"

const noStore = { "Cache-Control": "no-store" }

function done() {
  return new NextResponse(null, { status: 204, headers: noStore })
}

export async function POST(request: Request) {
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
    if (!sameSiteOrigin(request.headers.get("origin"), host)) return done()
    if (isLikelyBot(request.headers.get("user-agent"))) return done()
    const raw = await request.text()
    if (raw.length > 120) return done()
    const visit = readVisitBeacon(JSON.parse(raw) as unknown)
    if (!visit) return done()
    await recordVisit(visit)
  } catch {
    // La página no depende de este conteo.
  }
  return done()
}
