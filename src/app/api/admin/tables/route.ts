import { revalidateTag } from "next/cache"
import { NextResponse } from "next/server"

import { requestIsTrusted } from "@/lib/auth/session-policy"
import { StaffAccessError } from "@/server/auth/authorization"
import { readStaffGate } from "@/server/auth/session"
import { enableFloor, FloorError, saveDay, saveFloor } from "@/server/operations/service"

const noStore = { "Cache-Control": "private, no-store" }

function fail(error: unknown) {
  if (error instanceof FloorError) {
    return NextResponse.json({ ok: false, message: error.message, issues: error.issues }, { status: error.status, headers: noStore })
  }
  if (error instanceof StaffAccessError) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403, headers: noStore })
  }
  if (error instanceof Error && error.message.includes("Firestore está apagado")) {
    return NextResponse.json({ ok: false, message: "Las mesas en Firestore están apagadas en este entorno." }, { status: 503, headers: noStore })
  }
  return NextResponse.json({ ok: false, message: "No se pudo guardar la configuración." }, { status: 500, headers: noStore })
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

  const body = (await request.json().catch(() => null)) as { action?: unknown; rules?: unknown; day?: unknown; section?: unknown } | null
  try {
    if (body?.action === "save") {
      const rules = await saveFloor(gate.session, body.rules, body.section)
      revalidateTag("operations", "max")
      return NextResponse.json({ ok: true, productionReady: rules.productionReady }, { headers: noStore })
    }
    if (body?.action === "save-day") {
      await saveDay(gate.session, body.day)
      revalidateTag("operations", "max")
      return NextResponse.json({ ok: true }, { headers: noStore })
    }
    if (body?.action === "enable") {
      const rules = await enableFloor(gate.session)
      revalidateTag("operations", "max")
      return NextResponse.json({ ok: true, productionReady: rules.productionReady }, { headers: noStore })
    }
    return NextResponse.json({ ok: false, message: "Esa acción no es válida." }, { status: 400, headers: noStore })
  } catch (error) {
    return fail(error)
  }
}
