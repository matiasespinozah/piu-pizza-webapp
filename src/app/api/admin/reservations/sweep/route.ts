import { NextResponse } from "next/server"

import { authorizeNoticeCron } from "@/lib/reservations/notice-cron"
import { sweepNotices } from "@/server/reservations/notifications"

const noStore = { "Cache-Control": "no-store" }

export async function POST(request: Request) {
  if (!authorizeNoticeCron(request.headers.get("authorization"), process.env.PIU_NOTICES_CRON_SECRET)) {
    return NextResponse.json({ ok: false }, { status: 404, headers: noStore })
  }
  await sweepNotices()
  return NextResponse.json({ ok: true }, { headers: noStore })
}
