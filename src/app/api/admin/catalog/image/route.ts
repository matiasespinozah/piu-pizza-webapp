import { revalidateTag } from "next/cache"
import { NextResponse } from "next/server"

import { requestIsTrusted } from "@/lib/auth/session-policy"
import { StaffAccessError } from "@/server/auth/authorization"
import { readStaffGate } from "@/server/auth/session"
import { maxUploadBytes } from "@/server/catalog/images"
import { CatalogError, replaceProductPhoto } from "@/server/catalog/service"

const noStore = { "Cache-Control": "private, no-store" }

/** El cuerpo trae la foto más el id del producto y los bordes del formulario. */
const maxBodyBytes = maxUploadBytes + 64 * 1024

function tooLarge() {
  return NextResponse.json({ ok: false, message: "La foto tiene que pesar menos de 8 MB." }, { status: 413, headers: noStore })
}

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

  // Se corta antes de leer el cuerpo: así una subida enorme no llena la memoria de la instancia.
  // Si el encabezado no llega, queda el tope por archivo de más abajo.
  const declared = Number(request.headers.get("content-length"))
  if (Number.isFinite(declared) && declared > maxBodyBytes) return tooLarge()

  const form = await request.formData().catch(() => null)
  const id = form?.get("productId")
  const file = form?.get("file")
  if (typeof id !== "string" || !(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "Falta el producto o la foto." }, { status: 400, headers: noStore })
  }

  if (file.size > maxUploadBytes) return tooLarge()

  try {
    const saved = await replaceProductPhoto(gate.session, id, Buffer.from(await file.arrayBuffer()))
    revalidateTag("catalog", { expire: 0 })
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
