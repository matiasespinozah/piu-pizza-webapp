"use client"

import { useActionState, useState } from "react"

import { Button } from "@/components/ui/button"
import { FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/typography"
import { adminRequestHeader, adminRequestValue } from "@/lib/auth/session-policy"

type InviteFormState = { ok: true; link: string; email: string; expiresAt: string } | { ok: false; message: string } | null

async function createInvitation(_current: InviteFormState, formData: FormData): Promise<InviteFormState> {
  const response = await fetch("/api/admin/staff", {
    method: "POST",
    headers: { "content-type": "application/json", [adminRequestHeader]: adminRequestValue },
    body: JSON.stringify({ email: formData.get("email") }),
  })
  const body: unknown = await response.json().catch(() => null)
  if (typeof body === "object" && body && "ok" in body && body.ok === true && "link" in body && "email" in body && "expiresAt" in body) {
    return { ok: true, link: String(body.link), email: String(body.email), expiresAt: String(body.expiresAt) }
  }
  const message = typeof body === "object" && body && "message" in body ? String(body.message) : "No pudimos crear la invitación."
  return { ok: false, message }
}

function StaffInviteForm() {
  const [state, action, pending] = useActionState(createInvitation, null)
  const [copied, setCopied] = useState(false)

  async function copy() {
    if (!state?.ok) return
    try {
      await navigator.clipboard.writeText(state.link)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="admin-card flex flex-col gap-4 p-4">
      <div>
        <h2 className="font-heading text-lg font-bold text-olive">Nueva invitación</h2>
        <Text tone="muted" className="mt-1">
          El enlace es de un solo uso, vence en 48 horas y se muestra una sola vez. Envíalo tú por WhatsApp.
        </Text>
      </div>
      <form action={action} className="flex flex-col gap-4" onSubmit={() => setCopied(false)}>
        <div>
          <FieldLabel htmlFor="staff-invite-email">Correo del trabajador</FieldLabel>
          <Input
            id="staff-invite-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="off"
            spellCheck={false}
            required
            className="admin-control mt-2"
          />
        </div>
        <FieldError>{state && !state.ok ? state.message : null}</FieldError>
        <Button type="submit" className="w-full sm:w-auto" loading={pending}>
          {pending ? "Generando" : "Generar invitación"}
        </Button>
      </form>
      {state?.ok ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-cream/70 p-3">
          <p className="text-sm text-olive">
            Invitación para <span className="font-semibold">{state.email}</span>. Cópiala ahora: no vuelve a mostrarse.
          </p>
          <p className="break-all font-label text-xs leading-5 text-olive-muted">{state.link}</p>
          <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={copy}>
            {copied ? "Enlace copiado" : "Copiar enlace"}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export { StaffInviteForm }
