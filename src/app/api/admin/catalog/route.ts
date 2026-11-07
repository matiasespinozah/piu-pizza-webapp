import { revalidateTag } from "next/cache"
import { NextResponse } from "next/server"

import { requestIsTrusted } from "@/lib/auth/session-policy"
import { StaffAccessError } from "@/server/auth/authorization"
import { readStaffGate } from "@/server/auth/session"
import { CatalogError, deleteCategory, deleteProduct, saveCategory, saveProduct } from "@/server/catalog/service"

const noStore = { "Cache-Control": "private, no-store" }

function fail(error: unknown) {
  if (error instanceof CatalogError) {
    return NextResponse.json({ ok: false, message: error.message }, { status: error.status, headers: noStore })
  }
  if (error instanceof StaffAccessError) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403, headers: noStore })
  }
  if (error instanceof Error && error.message.includes("Firestore está apagado")) {
    return NextResponse.json({ ok: false, message: "La carta en Firestore está apagada en este entorno." }, { status: 503, headers: noStore })
  }
  return NextResponse.json({ ok: false, message: "No se pudo guardar la carta." }, { status: 500, headers: noStore })
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

  const body = (await request.json().catch(() => null)) as { action?: unknown; category?: unknown; product?: unknown; id?: unknown } | null

  try {
    if (body?.action === "save-category") {
      const saved = await saveCategory(gate.session, body.category)
      revalidateTag("catalog", "max")
      return NextResponse.json({ ok: true, ...saved }, { headers: noStore })
    }
    if (body?.action === "delete-category") {
      if (typeof body.id !== "string") return NextResponse.json({ ok: false, message: "Falta la categoría." }, { status: 400, headers: noStore })
      await deleteCategory(gate.session, body.id)
      revalidateTag("catalog", "max")
      return NextResponse.json({ ok: true }, { headers: noStore })
    }
    if (body?.action === "save-product") {
      const saved = await saveProduct(gate.session, body.product)
      revalidateTag("catalog", "max")
      return NextResponse.json({ ok: true, ...saved }, { headers: noStore })
    }
    if (body?.action === "delete-product") {
      if (typeof body.id !== "string") return NextResponse.json({ ok: false, message: "Falta el producto." }, { status: 400, headers: noStore })
      await deleteProduct(gate.session, body.id)
      revalidateTag("catalog", "max")
      return NextResponse.json({ ok: true }, { headers: noStore })
    }
    return NextResponse.json({ ok: false, message: "Esa acción no es válida." }, { status: 400, headers: noStore })
  } catch (error) {
    return fail(error)
  }
}
