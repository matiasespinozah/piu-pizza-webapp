import { NextResponse } from "next/server"
import { z } from "zod"

import { requestIsTrusted } from "@/lib/auth/session-policy"
import { ReservationError } from "@/lib/reservations/errors"
import { StaffAccessError } from "@/server/auth/authorization"
import { readStaffGate } from "@/server/auth/session"
import { createStaffReservation, listReservationsForStaff, type ListQuery } from "@/server/reservations/service"

const noStore = { "Cache-Control": "no-store" }

const createBody = z
  .object({
    customerName: z.string().trim().min(2).max(80),
    customerPhone: z.string().trim().min(8).max(20),
    date: z.string(),
    preferredTime: z.string(),
    partySize: z.number().int(),
    preferredZone: z.enum(["salon", "terrace"]),
    notes: z.string().max(280).optional(),
    tableLabel: z.string().max(40).optional(),
    confirm: z.boolean().optional(),
    exceptionConfirmed: z.boolean().optional(),
    exceptionReason: z.string().max(160).optional(),
  })
  .strict()

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

function trusted(request: Request) {
  return requestIsTrusted({
    origin: request.headers.get("origin"),
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    requestedWith: request.headers.get("x-piu-requested-with"),
  })
}

export async function POST(request: Request) {
  if (!trusted(request)) return NextResponse.json({ ok: false, message: "No se pudo completar la operación." }, { status: 403, headers: noStore })
  const gate = await readStaffGate()
  if (gate.status !== 200) return NextResponse.json({ ok: false }, { status: gate.status, headers: noStore })
  const parsed = createBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Revisa los datos de la reserva." }, { status: 400, headers: noStore })
  try {
    const reservation = await createStaffReservation(gate.session, parsed.data)
    return NextResponse.json({ ok: true, reservation }, { headers: noStore })
  } catch (error) {
    return fail(error)
  }
}
