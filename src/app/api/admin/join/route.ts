import { NextResponse } from "next/server"
import { z } from "zod"

import { clientAddress } from "@/lib/reservations/client-address"
import { requestIsTrusted } from "@/lib/auth/session-policy"
import { InviteError, inviteFailureMessage, inviteTokenPattern, normalizeStaffEmail, staffEmailIsValid } from "@/lib/staff/invitation"
import { previewStaffInvitation, redeemStaffInvitation, linkStaffInvitation } from "@/server/staff/invitations"

const noStore = { "Cache-Control": "private, no-store" }

const bodySchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("preview"), token: z.string().regex(inviteTokenPattern) }).strict(),
  z.object({
    intent: z.literal("redeem"),
    token: z.string().regex(inviteTokenPattern),
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().max(120),
    password: z.string().min(8).max(128),
  }).strict(),
  z.object({
    intent: z.literal("link"),
    token: z.string().regex(inviteTokenPattern),
    name: z.string().trim().min(2).max(80),
    idToken: z.string().min(20).max(8192),
  }).strict(),
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
  if (error instanceof InviteError) {
    const status = error.code === "rate" ? 429 : 400
    return NextResponse.json({ ok: false, message: error.message }, { status, headers: noStore })
  }
  return NextResponse.json({ ok: false, message: inviteFailureMessage("unavailable") }, { status: 500, headers: noStore })
}

export async function POST(request: Request) {
  if (!trusted(request)) return NextResponse.json({ ok: false, message: "No se pudo completar la operación." }, { status: 403, headers: noStore })
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Esta invitación no está disponible." }, { status: 400, headers: noStore })
  }

  const address = clientAddress(request.headers.get("x-forwarded-for"))
  try {
    if (parsed.data.intent === "preview") {
      const preview = await previewStaffInvitation(parsed.data.token, address)
      return NextResponse.json({ ok: true, email: preview.email, accountExists: preview.accountExists }, { headers: noStore })
    }
    if (parsed.data.intent === "link") {
      const linked = await linkStaffInvitation({
        token: parsed.data.token,
        name: parsed.data.name,
        idToken: parsed.data.idToken,
        address,
      })
      return NextResponse.json({ ok: true, emailVerified: linked.emailVerified }, { headers: noStore })
    }
    const email = normalizeStaffEmail(parsed.data.email)
    if (!staffEmailIsValid(email)) {
      return NextResponse.json({ ok: false, message: "El correo no corresponde a la invitación." }, { status: 400, headers: noStore })
    }
    const redeemed = await redeemStaffInvitation({
      token: parsed.data.token,
      name: parsed.data.name,
      email,
      password: parsed.data.password,
      address,
    })
    return NextResponse.json({ ok: true, emailVerified: redeemed.emailVerified }, { headers: noStore })
  } catch (error) {
    return failure(error)
  }
}
