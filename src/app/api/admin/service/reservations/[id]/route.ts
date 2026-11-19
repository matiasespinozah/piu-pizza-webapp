import { NextResponse } from "next/server"
import { z } from "zod"

import { requestIsTrusted } from "@/lib/auth/session-policy"
import { ReservationError } from "@/lib/reservations/errors"
import { StaffAccessError } from "@/server/auth/authorization"
import { readStaffGate } from "@/server/auth/session"
import { transitionReservation } from "@/server/reservations/service"

const noStore = { "Cache-Control": "no-store" }

const bodySchema = z
  .object({
    action: z.enum(["arrive", "assign", "complete"]),
    revision: z.number().int().positive(),
    tableLabel: z.string().max(40).optional(),
  })
  .strict()

function trusted(request: Request) {
  return requestIsTrusted({
    origin: request.headers.get("origin"),
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    requestedWith: request.headers.get("x-piu-requested-with"),
  })
}

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  if (!trusted(request)) return NextResponse.json({ ok: false, message: "No se pudo completar la operación." }, { status: 403, headers: noStore })
  const gate = await readStaffGate()
  if (gate.status !== 200) return NextResponse.json({ ok: false, message: "La sesión caducó. Vuelve a entrar." }, { status: gate.status, headers: noStore })
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Revisa la acción e inténtalo de nuevo." }, { status: 400, headers: noStore })
  const { id } = await context.params
  try {
    await transitionReservation(gate.session, { id, ...parsed.data })
    return NextResponse.json({ ok: true }, { headers: noStore })
  } catch (error) {
    if (error instanceof ReservationError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status, headers: noStore })
    }
    if (error instanceof StaffAccessError) return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403, headers: noStore })
    return NextResponse.json({ ok: false, message: "No se pudo completar la operación." }, { status: 500, headers: noStore })
  }
}
