import { z } from "zod"
import { NextResponse } from "next/server"

import { requestIsTrusted } from "@/lib/auth/session-policy"
import { StaffAccessError } from "@/server/auth/authorization"
import { clearStaffSession, createStaffSession } from "@/server/auth/session"

const tokenBody = z.object({ idToken: z.string().min(20).max(8192) }).strict()

function trusted(request: Request) {
  return requestIsTrusted({
    origin: request.headers.get("origin"),
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    requestedWith: request.headers.get("x-piu-requested-with"),
  })
}

function denied(status: number) {
  return NextResponse.json({ ok: false }, { status, headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: Request) {
  if (!trusted(request)) return denied(403)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return denied(400)
  }

  const parsed = tokenBody.safeParse(body)
  if (!parsed.success) return denied(400)

  try {
    await createStaffSession(parsed.data.idToken)
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    return denied(error instanceof StaffAccessError ? 403 : 401)
  }
}

export async function DELETE(request: Request) {
  if (!trusted(request)) return denied(403)
  await clearStaffSession()
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
}
