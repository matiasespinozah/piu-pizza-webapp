import "server-only"

import { z } from "zod"

import { clientAddress } from "@/lib/reservations/client-address"
import { ReservationError } from "@/lib/reservations/errors"
import { trackingLimits } from "@/lib/reservations/tracking"
import { readPublicStatus } from "@/server/reservations/tracking"

const statusNoStore = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
}

const bodySchema = z
  .object({
    credential: z.string().min(1).max(trackingLimits.maxCredentialLength),
  })
  .strict()

function reply(body: unknown, status = 200) {
  return Response.json(body, { status, headers: statusNoStore })
}

function fail(error: unknown) {
  if (error instanceof ReservationError) return reply({ ok: false, message: error.message }, error.status)
  return reply({ ok: false, message: "No pudimos consultar el estado." }, 500)
}

async function postReservationStatus(request: Request) {
  const length = Number(request.headers.get("content-length") ?? "0")
  if (Number.isFinite(length) && length > trackingLimits.maxBodyLength) {
    return reply({ ok: false, message: "No pudimos leer la consulta." }, 400)
  }
  let raw = ""
  try {
    raw = await request.text()
  } catch {
    return reply({ ok: false, message: "No pudimos leer la consulta." }, 400)
  }
  if (raw.length > trackingLimits.maxBodyLength) {
    return reply({ ok: false, message: "No pudimos leer la consulta." }, 400)
  }
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return reply({ ok: false, message: "No pudimos leer la consulta." }, 400)
  }
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) return reply({ ok: false, message: "Pega el enlace completo de seguimiento." }, 400)

  try {
    const status = await readPublicStatus(parsed.data.credential, clientAddress(request.headers.get("x-forwarded-for")))
    return reply({ ok: true, status })
  } catch (error) {
    return fail(error)
  }
}

export { postReservationStatus, statusNoStore }
