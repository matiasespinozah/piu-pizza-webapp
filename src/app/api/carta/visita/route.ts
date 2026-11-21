import { NextResponse } from "next/server"

import { isLikelyBot, readCartaBeacon, sameSiteOrigin } from "@/lib/metrics/carta-visit"
import { recordCartaVisit } from "@/server/metrics/carta"

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
    if (raw.length > 80) return done()
    const visit = readCartaBeacon(JSON.parse(raw) as unknown)
    if (!visit) return done()
    await recordCartaVisit(visit)
  } catch {
    // La carta no depende de este conteo.
  }
  return done()
}
