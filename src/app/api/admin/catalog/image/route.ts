import { revalidateTag } from "next/cache"
import { NextResponse } from "next/server"

import { requestIsTrusted } from "@/lib/auth/session-policy"
import { StaffAccessError } from "@/server/auth/authorization"
import { readStaffGate } from "@/server/auth/session"
import { CatalogError, replaceProductPhoto } from "@/server/catalog/service"

const noStore = { "Cache-Control": "private, no-store" }

export async function POST(request: Request) {
  const trusted = requestIsTrusted({
    origin: request.headers.get("origin"),
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    requestedWith: request.headers.get("x-piu-requested-with"),
  })
  if (!trusted) return NextResponse.json({ ok: false, message: "No se pudo completar la operación." }, { status: 403, headers: noStore })

  const gate = await readStaffGate()
  if (gate.status !== 200) return NextResponse.json({ ok: false }, { status: gate.status, headers: noStore })

  const form = await request.formData().catch(() => null)
  const id = form?.get("productId")
  const file = form?.get("file")
  if (typeof id !== "string" || !(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "Falta el producto o la foto." }, { status: 400, headers: noStore })
  }

  try {
    const saved = await replaceProductPhoto(gate.session, id, Buffer.from(await file.arrayBuffer()))
    revalidateTag("catalog", "max")
    return NextResponse.json({ ok: true, ...saved }, { headers: noStore })
  } catch (error) {
    if (error instanceof CatalogError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status, headers: noStore })
    }
    if (error instanceof StaffAccessError) {
      return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403, headers: noStore })
    }
    if (error instanceof Error && error.message.includes("Firestore está apagado")) {
      return NextResponse.json({ ok: false, message: "La carta en Firestore está apagada en este entorno." }, { status: 503, headers: noStore })
    }
    return NextResponse.json({ ok: false, message: "No se pudo guardar la foto." }, { status: 500, headers: noStore })
  }
}
