import { NextResponse } from "next/server"

import { ReservationError } from "@/lib/reservations/errors"
import { StaffAccessError } from "@/server/auth/authorization"
import { readStaffGate } from "@/server/auth/session"
import { listReservationsForStaff, type ListQuery } from "@/server/reservations/service"

const noStore = { "Cache-Control": "no-store" }

function fail(error: unknown) {
  if (error instanceof ReservationError) {
    return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.status, headers: noStore })
  }
  if (error instanceof StaffAccessError) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403, headers: noStore })
  }
  return NextResponse.json({ ok: false, message: "No se pudo completar la operación." }, { status: 500, headers: noStore })
}

function one(value: string | null) {
  const text = value?.trim()
  return text ? text : undefined
}

export async function GET(request: Request) {
  const gate = await readStaffGate()
  if (gate.status !== 200) return NextResponse.json({ ok: false }, { status: gate.status, headers: noStore })

  const url = new URL(request.url)
  const query: ListQuery = {
    date: one(url.searchParams.get("date")),
    status: one(url.searchParams.get("status")),
    zone: one(url.searchParams.get("zone")),
    view: one(url.searchParams.get("view")),
    q: one(url.searchParams.get("q")),
    cursor: one(url.searchParams.get("cursor")),
  }

  try {
    const result = await listReservationsForStaff(gate.session, query)
    return NextResponse.json({ ok: true, ...result }, { headers: noStore })
  } catch (error) {
    return fail(error)
  }
}
