import { connection } from "next/server"

import { reservationStatusEnabled } from "@/lib/reservations/writes"
import { postReservationStatus, statusNoStore } from "@/server/reservations/status-request"

export async function GET() {
  await connection()
  return Response.json({ enabled: reservationStatusEnabled() }, { headers: statusNoStore })
}

export async function POST(request: Request) {
  return postReservationStatus(request)
}
