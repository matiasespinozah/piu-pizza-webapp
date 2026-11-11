import { NextResponse } from "next/server"
import { z } from "zod"

import { requestIsTrusted } from "@/lib/auth/session-policy"
import { ReservationError } from "@/lib/reservations/errors"
import { staffActions, type StaffAction } from "@/lib/reservations/transitions"
import { StaffAccessError } from "@/server/auth/authorization"
import { readStaffGate } from "@/server/auth/session"
import { getReservationForStaff, transitionReservation } from "@/server/reservations/service"
import { issueReservationTracking, revokeReservationTracking } from "@/server/reservations/tracking"

const noStore = { "Cache-Control": "no-store" }

const transitionBody = z
  .object({
    action: z.enum(staffActions),
    revision: z.number().int().positive(),
    reason: z.string().max(160).optional(),
    proposedDate: z.string().optional(),
    proposedTime: z.string().optional(),
    proposedZone: z.enum(["salon", "terrace"]).optional(),
    tableLabel: z.string().max(40).optional(),
    internalNotes: z.string().max(280).optional(),
    exceptionConfirmed: z.boolean().optional(),
  })
  .strict()

const trackingBody = z
  .object({
    action: z.enum(["issue_tracking", "revoke_tracking"]),
    revision: z.number().int().positive(),
  })
  .strict()

const patchBody = z.union([transitionBody, trackingBody])

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
  const parsed = patchBody.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Ese cambio no es válido." }, { status: 400, headers: noStore })
  }

  const { id } = await context.params
  try {
    let trackingToken: string | null = null
    const data = parsed.data
    if (data.action === "issue_tracking") {
      trackingToken = await issueReservationTracking(gate.session, id, data.revision)
    } else if (data.action === "revoke_tracking") {
      await revokeReservationTracking(gate.session, id, data.revision)
    } else if ((staffActions as readonly string[]).includes(data.action)) {
      await transitionReservation(gate.session, {
        id,
        action: data.action as StaffAction,
        revision: data.revision,
        reason: "reason" in data ? data.reason : undefined,
        proposedDate: "proposedDate" in data ? data.proposedDate : undefined,
        proposedTime: "proposedTime" in data ? data.proposedTime : undefined,
        proposedZone: "proposedZone" in data ? data.proposedZone : undefined,
        tableLabel: "tableLabel" in data ? data.tableLabel : undefined,
        internalNotes: "internalNotes" in data ? data.internalNotes : undefined,
        exceptionConfirmed: "exceptionConfirmed" in data ? data.exceptionConfirmed : undefined,
      })
    }
    const reservation = await getReservationForStaff(gate.session, id)
    return NextResponse.json(
      trackingToken ? { ok: true, reservation, trackingToken } : { ok: true, reservation },
      { headers: noStore }
    )
  } catch (error) {
    return fail(error)
  }
}
