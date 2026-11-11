"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/typography"
import { adminRequestHeader, adminRequestValue } from "@/lib/auth/session-policy"
import type { InvitationPhase } from "@/lib/staff/invitation"

type InvitationCard = {
  id: string
  email: string
  phase: InvitationPhase
  when: string
}

const groups: { phase: InvitationPhase; title: string; empty: string }[] = [
  { phase: "pending", title: "Sin usar", empty: "No hay invitaciones pendientes." },
  { phase: "used", title: "Utilizadas", empty: "Todavía no se usa ninguna invitación." },
  { phase: "expired", title: "Vencidas", empty: "No hay invitaciones vencidas." },
]

function phaseDetail(invite: InvitationCard) {
  if (invite.phase === "pending") return `Vence el ${invite.when}`
  if (invite.phase === "used") return `Usada el ${invite.when}`
  if (invite.phase === "revoked") return "Revocada"
  return `Venció el ${invite.when}`
}

function StaffInviteList({ invites }: { invites: InvitationCard[] }) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState("")
  const [error, setError] = useState("")
  const revoked = invites.filter((invite) => invite.phase === "revoked")
  const expired = [...invites.filter((invite) => invite.phase === "expired"), ...revoked]

  async function revoke(id: string) {
    setPendingId(id)
    setError("")
    const response = await fetch("/api/admin/staff", {
      method: "DELETE",
      headers: { "content-type": "application/json", [adminRequestHeader]: adminRequestValue },
      body: JSON.stringify({ id }),
    })
    const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null
    setPendingId("")
    if (!result?.ok) {
      setError(result?.message || "No pudimos revocar la invitación.")
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => {
        const rows = group.phase === "expired" ? expired : invites.filter((invite) => invite.phase === group.phase)
        return (
          <section key={group.phase} className="admin-card p-4">
            <h2 className="font-heading text-lg font-bold text-olive">{group.title}</h2>
            {rows.length === 0 ? (
              <Text tone="muted" className="mt-2">
                {group.empty}
              </Text>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {rows.map((invite) => (
                  <li key={invite.id} className="flex flex-col gap-3 border-t border-olive-line/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-olive">{invite.email}</p>
                      <p className="text-sm text-olive-muted">{phaseDetail(invite)}</p>
                    </div>
                    {invite.phase === "pending" ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full sm:w-auto"
                        loading={pendingId === invite.id}
                        onClick={() => revoke(invite.id)}
                      >
                        Revocar
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
      {error ? <p className="text-sm font-semibold text-terracotta">{error}</p> : null}
    </div>
  )
}

export { StaffInviteList }
export type { InvitationCard }
