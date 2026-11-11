import { NextResponse } from "next/server"
import { z } from "zod"

import { staffRoleSchema } from "@/lib/auth/roles"
import { requestIsTrusted } from "@/lib/auth/session-policy"
import { StaffAccessError } from "@/server/auth/authorization"
import { readStaffGate } from "@/server/auth/session"
import { StaffControlError, approveStaff, changeStaffRole, reactivateStaff, rejectStaff, revokeStaffAccess, suspendStaff } from "@/server/staff/access"

const noStore = { "Cache-Control": "private, no-store" }

const bodySchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("approve"), uid: z.string(), role: staffRoleSchema, confirmOwner: z.boolean() }).strict(),
  z.object({ intent: z.literal("reject"), uid: z.string() }).strict(),
  z.object({ intent: z.literal("role"), uid: z.string(), role: staffRoleSchema, confirmOwner: z.boolean() }).strict(),
  z.object({ intent: z.literal("suspend"), uid: z.string() }).strict(),
  z.object({ intent: z.literal("reactivate"), uid: z.string() }).strict(),
  z.object({ intent: z.literal("revoke"), uid: z.string() }).strict(),
])

function trusted(request: Request) {
  return requestIsTrusted({
    origin: request.headers.get("origin"),
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    requestedWith: request.headers.get("x-piu-requested-with"),
  })
}

function failure(error: unknown) {
  if (error instanceof StaffControlError) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 400, headers: noStore })
  }
  if (error instanceof StaffAccessError) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403, headers: noStore })
  }
  return NextResponse.json({ ok: false, message: "No pudimos actualizar el acceso." }, { status: 500, headers: noStore })
}

export async function POST(request: Request) {
  if (!trusted(request)) return NextResponse.json({ ok: false, message: "No se pudo completar la operación." }, { status: 403, headers: noStore })
  const gate = await readStaffGate()
  if (gate.status !== 200) return NextResponse.json({ ok: false, message: "Tu sesión venció. Vuelve a entrar." }, { status: gate.status, headers: noStore })

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ ok: false, message: "No pudimos actualizar el acceso." }, { status: 400, headers: noStore })

  try {
    const actor = gate.session
    const body = parsed.data
    if (body.intent === "approve") await approveStaff(actor, body.uid, body.role, body.confirmOwner)
    else if (body.intent === "reject") await rejectStaff(actor, body.uid)
    else if (body.intent === "role") await changeStaffRole(actor, body.uid, body.role, body.confirmOwner)
    else if (body.intent === "suspend") await suspendStaff(actor, body.uid)
    else if (body.intent === "reactivate") await reactivateStaff(actor, body.uid)
    else await revokeStaffAccess(actor, body.uid)
    return NextResponse.json({ ok: true }, { headers: noStore })
  } catch (error) {
    return failure(error)
  }
}
