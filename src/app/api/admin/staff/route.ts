import { NextResponse } from "next/server"

import { requestIsTrusted } from "@/lib/auth/session-policy"
import { InviteError, inviteFailureMessage, normalizeStaffEmail, staffEmailIsValid } from "@/lib/staff/invitation"
import { StaffAccessError } from "@/server/auth/authorization"
import { readStaffGate } from "@/server/auth/session"
import { createStaffInvitation, revokeStaffInvitation } from "@/server/staff/invitations"

const noStore = { "Cache-Control": "private, no-store" }

function trusted(request: Request) {
  return requestIsTrusted({
    origin: request.headers.get("origin"),
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    requestedWith: request.headers.get("x-piu-requested-with"),
  })
}

function failure(error: unknown) {
  if (error instanceof InviteError) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 400, headers: noStore })
  }
  if (error instanceof StaffAccessError) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403, headers: noStore })
  }
  return NextResponse.json({ ok: false, message: inviteFailureMessage("unavailable") }, { status: 500, headers: noStore })
}

function inviteLink(request: Request, token: string) {
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? ""
  const host = forwarded || request.headers.get("host") || ""
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http"
  if (!/^[A-Za-z0-9.-]+(?::\d{1,5})?$/.test(host) || (proto !== "https" && proto !== "http")) {
    throw new InviteError("unavailable")
  }
  return `${proto}://${host}/admin/unirse#${token}`
}

export async function POST(request: Request) {
  if (!trusted(request)) return NextResponse.json({ ok: false, message: "No se pudo completar la operación." }, { status: 403, headers: noStore })
  const gate = await readStaffGate()
  if (gate.status !== 200) return NextResponse.json({ ok: false, message: "Tu sesión venció. Vuelve a entrar." }, { status: gate.status, headers: noStore })

  const body = (await request.json().catch(() => null)) as { email?: unknown } | null
  const email = normalizeStaffEmail(typeof body?.email === "string" ? body.email : "")
  if (!staffEmailIsValid(email)) {
    return NextResponse.json({ ok: false, message: "Ingresa un correo válido." }, { status: 400, headers: noStore })
  }

  try {
    const created = await createStaffInvitation(gate.session, email)
    return NextResponse.json(
      { ok: true, link: inviteLink(request, created.token), email: created.email, expiresAt: created.expiresAt },
      { headers: noStore }
    )
  } catch (error) {
    return failure(error)
  }
}

export async function DELETE(request: Request) {
  if (!trusted(request)) return NextResponse.json({ ok: false, message: "No se pudo completar la operación." }, { status: 403, headers: noStore })
  const gate = await readStaffGate()
  if (gate.status !== 200) return NextResponse.json({ ok: false, message: "Tu sesión venció. Vuelve a entrar." }, { status: gate.status, headers: noStore })

  const body = (await request.json().catch(() => null)) as { id?: unknown } | null
  if (typeof body?.id !== "string") {
    return NextResponse.json({ ok: false, message: "Esta invitación no está disponible." }, { status: 400, headers: noStore })
  }

  try {
    await revokeStaffInvitation(gate.session, body.id)
    return NextResponse.json({ ok: true }, { headers: noStore })
  } catch (error) {
    return failure(error)
  }
}
