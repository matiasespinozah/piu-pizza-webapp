import { NextResponse } from "next/server"
import { z } from "zod"

import { requestIsTrusted } from "@/lib/auth/session-policy"
import { StaffAccessError } from "@/server/auth/authorization"
import { readStaffGate } from "@/server/auth/session"
import { listStaffNotices, markStaffNoticesRead } from "@/server/reservations/notifications"

const noStore = { "Cache-Control": "no-store" }

const bodySchema = z.object({ ids: z.array(z.string()).max(20) }).strict()

function trusted(request: Request) {
  return requestIsTrusted({
    origin: request.headers.get("origin"),
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    requestedWith: request.headers.get("x-piu-requested-with"),
  })
}

export async function GET() {
  const gate = await readStaffGate()
  if (gate.status !== 200) return NextResponse.json({ ok: false }, { status: gate.status, headers: noStore })
  try {
    const notices = await listStaffNotices(gate.session)
    return NextResponse.json({ ok: true, notices, unread: notices.filter((item) => item.unread).length }, { headers: noStore })
  } catch (error) {
    if (error instanceof StaffAccessError) return NextResponse.json({ ok: false }, { status: 403, headers: noStore })
    return NextResponse.json({ ok: false }, { status: 500, headers: noStore })
  }
}

export async function POST(request: Request) {
  if (!trusted(request)) return NextResponse.json({ ok: false }, { status: 403, headers: noStore })
  const gate = await readStaffGate()
  if (gate.status !== 200) return NextResponse.json({ ok: false }, { status: gate.status, headers: noStore })
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400, headers: noStore })
  await markStaffNoticesRead(gate.session, parsed.data.ids)
  return NextResponse.json({ ok: true }, { headers: noStore })
}
