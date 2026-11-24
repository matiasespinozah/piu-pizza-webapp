import { NextResponse } from "next/server"

import { authorizeNoticeCron } from "@/lib/reservations/notice-cron"
import { sweepReservationMail } from "@/server/reservations/mail"

const noStore = { "Cache-Control": "no-store" }

export async function POST(request: Request) {
  if (!authorizeNoticeCron(request.headers.get("authorization"), process.env.PIU_RESERVATION_MAIL_SECRET)) {
    return NextResponse.json({ ok: false }, { status: 404, headers: noStore })
  }
  await sweepReservationMail()
  return NextResponse.json({ ok: true }, { headers: noStore })
}
