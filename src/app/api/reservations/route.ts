import { connection } from "next/server"
import { NextResponse } from "next/server"

import { clientAddress } from "@/lib/reservations/client-address"
import { ReservationError } from "@/lib/reservations/errors"
import { readPublicBody } from "@/lib/reservations/public-request"
import { reservationWritesEnabled } from "@/lib/reservations/writes"
import { createPublicReservation } from "@/server/reservations/service"

const noStore = { "Cache-Control": "no-store" }

function originAllowed(request: Request) {
  const origin = request.headers.get("origin")
  if (!origin) return true
  try {
    const host = new URL(origin).host.toLowerCase()
    const expected = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "")
      .split(",")[0]
      .trim()
      .toLowerCase()
    return expected.length > 0 && host === expected
  } catch {
    return false
  }
}

function fail(error: unknown) {
  if (error instanceof ReservationError) {
    return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.status, headers: noStore })
  }
  return NextResponse.json({ ok: false, message: "No se pudo completar la operación." }, { status: 500, headers: noStore })
}

export async function GET() {
  await connection()
  return NextResponse.json({ enabled: reservationWritesEnabled() }, { headers: noStore })
}

export async function POST(request: Request) {
  if (!originAllowed(request)) {
    return NextResponse.json({ ok: false, message: "No se pudo completar la operación." }, { status: 403, headers: noStore })
  }

  const raw = await request.text()
  try {
    const input = readPublicBody(raw)
    const forwarded = clientAddress(request.headers.get("x-forwarded-for"))
    const result = await createPublicReservation(input, forwarded)
    return NextResponse.json(
      { ok: true, duplicate: result.duplicate, request: result.receipt },
      { status: result.duplicate ? 200 : 201, headers: noStore }
    )
  } catch (error) {
    return fail(error)
  }
}
