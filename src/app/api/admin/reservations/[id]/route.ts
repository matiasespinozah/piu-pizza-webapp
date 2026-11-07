import { NextResponse } from "next/server"
import { z } from "zod"

import { requestIsTrusted } from "@/lib/auth/session-policy"
import { ReservationError } from "@/lib/reservations/errors"
import { staffActions } from "@/lib/reservations/transitions"
import { StaffAccessError } from "@/server/auth/authorization"
import { readStaffGate } from "@/server/auth/session"
import { getReservationForStaff, transitionReservation } from "@/server/reservations/service"

const noStore = { "Cache-Control": "no-store" }

const transitionBody = z
  .object({
    action: z.enum(staffActions),
    revision: z.number().int().positive(),
    reason: z.string().max(160).optional(),
    proposedDate: z.string().optional(),
    proposedTime: z.string().optional(),
    proposedZone: z.enum(["salon", "terrace"]).optional(),
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

function trusted(request: Request) {
  return requestIsTrusted({
    origin: request.headers.get("origin"),
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    requestedWith: request.headers.get("x-piu-requested-with"),
  })
}

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const gate = await readStaffGate()
  if (gate.status !== 200) return NextResponse.json({ ok: false }, { status: gate.status, headers: noStore })
  const { id } = await context.params
  try {
    const reservation = await getReservationForStaff(gate.session, id)
    return NextResponse.json({ ok: true, reservation }, { headers: noStore })
  } catch (error) {
    return fail(error)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!trusted(request)) {
    return NextResponse.json({ ok: false, message: "No se pudo completar la operación." }, { status: 403, headers: noStore })
  }
  const gate = await readStaffGate()
  if (gate.status !== 200) return NextResponse.json({ ok: false }, { status: gate.status, headers: noStore })

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ ok: false, message: "No pudimos leer la solicitud." }, { status: 400, headers: noStore })
  }
  const parsed = transitionBody.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Ese cambio no es válido." }, { status: 400, headers: noStore })
  }

  const { id } = await context.params
  try {
    await transitionReservation(gate.session, { id, ...parsed.data })
    const reservation = await getReservationForStaff(gate.session, id)
    return NextResponse.json({ ok: true, reservation }, { headers: noStore })
  } catch (error) {
    return fail(error)
  }
}
