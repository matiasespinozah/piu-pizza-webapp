import { NextResponse } from "next/server"

import { StaffAccessError } from "@/server/auth/authorization"
import { readStaffGate } from "@/server/auth/session"
import { listServiceBoard } from "@/server/reservations/service-desk"

const noStore = { "Cache-Control": "no-store" }

export async function GET() {
  const gate = await readStaffGate()
  if (gate.status !== 200) return NextResponse.json({ ok: false }, { status: gate.status, headers: noStore })
  try {
    const board = await listServiceBoard(gate.session)
    return NextResponse.json({ ok: true, board }, { headers: noStore })
  } catch (error) {
    if (error instanceof StaffAccessError) return NextResponse.json({ ok: false }, { status: 403, headers: noStore })
    return NextResponse.json({ ok: false }, { status: 500, headers: noStore })
  }
}
