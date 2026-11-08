import { z } from "zod"

import { ReservationError } from "@/lib/reservations/errors"
import { validateContact } from "@/lib/reservations/validation"
import type { ReservationZone } from "@/lib/reservations/types"

const publicRequestSchema = z
  .object({
    idempotencyKey: z.string().uuid(),
    date: z.string(),
    preferredTime: z.string(),
    partySize: z.number().int(),
    preferredZone: z.enum(["salon", "terrace"]),
    customerName: z.string(),
    customerPhone: z.string(),
    notes: z.string().optional(),
  })
  .strict()

type PublicReservationInput = {
  idempotencyKey: string
  date: string
  preferredTime: string
  partySize: number
  preferredZone: ReservationZone
  customerName: string
  customerPhone: string
  notes: string
}

const maxPayloadChars = 4000

function readPublicBody(raw: string, now = new Date(), rules?: Parameters<typeof validateContact>[2]): PublicReservationInput {
  if (raw.length > maxPayloadChars) {
    throw new ReservationError(400, "invalid", "La solicitud es demasiado grande.")
  }

  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    throw new ReservationError(400, "invalid", "No pudimos leer la solicitud.")
  }

  const parsed = publicRequestSchema.safeParse(json)
  if (!parsed.success) {
    throw new ReservationError(400, "invalid", "Revisa los datos de la solicitud. No se aceptan confirmaciones ni mesas.")
  }

  const draft = {
    date: parsed.data.date,
    partySize: parsed.data.partySize,
    zone: parsed.data.preferredZone,
    preferredTime: parsed.data.preferredTime,
    customerName: parsed.data.customerName,
    customerPhone: parsed.data.customerPhone,
    notes: parsed.data.notes ?? "",
  }
  const errors = validateContact(draft, now, rules)
  const message = Object.values(errors)[0]
  if (message) throw new ReservationError(422, "invalid", message)

  return {
    idempotencyKey: parsed.data.idempotencyKey,
    date: draft.date,
    preferredTime: draft.preferredTime,
    partySize: draft.partySize,
    preferredZone: parsed.data.preferredZone,
    customerName: draft.customerName.trim(),
    customerPhone: draft.customerPhone,
    notes: draft.notes.trim(),
  }
}

export { maxPayloadChars, readPublicBody }
export type { PublicReservationInput }
