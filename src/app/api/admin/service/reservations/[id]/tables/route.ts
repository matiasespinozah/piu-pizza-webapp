import { NextResponse } from "next/server"

import { ReservationError } from "@/lib/reservations/errors"
import { StaffAccessError } from "@/server/auth/authorization"
import { readStaffGate } from "@/server/auth/session"
import { tablesForService } from "@/server/reservations/service-desk"

const noStore = { "Cache-Control": "no-store" }

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const gate = await readStaffGate()
  if (gate.status !== 200) return NextResponse.json({ ok: false }, { status: gate.status, headers: noStore })
  const { id } = await context.params
  try {
    const result = await tablesForService(gate.session, id)
    return NextResponse.json({ ok: true, ...result }, { headers: noStore })
  } catch (error) {
    if (error instanceof ReservationError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status, headers: noStore })
    }
    if (error instanceof StaffAccessError) return NextResponse.json({ ok: false }, { status: 403, headers: noStore })
    return NextResponse.json({ ok: false }, { status: 500, headers: noStore })
  }
}
