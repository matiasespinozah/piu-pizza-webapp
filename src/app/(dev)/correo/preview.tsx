"use client"

import { useState } from "react"

function MailPreview({ received, confirmed }: { received: string; confirmed: string }) {
  const [kind, setKind] = useState<"received" | "confirmed">("received")
  const [width, setWidth] = useState<375 | 600>(375)
  const html = kind === "received" ? received : confirmed

  return (
    <main className="min-h-svh bg-cream px-4 py-6 text-olive">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <h1 className="font-heading text-2xl">Vista previa de correos</h1>
        <p className="text-sm text-olive-strong">Datos de ejemplo. Esta página no envía correos y no se publica.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="min-h-11 rounded-full bg-olive px-4 text-sm font-semibold text-cream" onClick={() => setKind("received")} aria-pressed={kind === "received"}>
            Solicitud recibida
          </button>
          <button type="button" className="min-h-11 rounded-full bg-olive px-4 text-sm font-semibold text-cream" onClick={() => setKind("confirmed")} aria-pressed={kind === "confirmed"}>
            Reserva confirmada
          </button>
          <button type="button" className="min-h-11 rounded-full border border-olive px-4 text-sm font-semibold" onClick={() => setWidth(375)} aria-pressed={width === 375}>
            Celular
          </button>
          <button type="button" className="min-h-11 rounded-full border border-olive px-4 text-sm font-semibold" onClick={() => setWidth(600)} aria-pressed={width === 600}>
            Escritorio
          </button>
        </div>
        <iframe title="Vista previa del correo" srcDoc={html} className="mx-auto h-[80svh] max-w-full border border-olive-line bg-cream" style={{ width }} />
      </div>
    </main>
  )
}

export { MailPreview }
