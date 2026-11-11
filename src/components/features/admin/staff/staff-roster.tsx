"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/typography"
import { adminRequestHeader, adminRequestValue } from "@/lib/auth/session-policy"
import type { StaffRole } from "@/lib/auth/roles"

type StaffStatus = "pending" | "active" | "rejected" | "suspended"

type MemberCard = {
  uid: string
  name: string
  email: string
  role: StaffRole | null
  roleLabel: string
  status: StaffStatus
  emailVerified: boolean
}

const groups: { key: "pending" | "active" | "closed"; title: string; empty: string }[] = [
  { key: "pending", title: "Pendientes de aprobación", empty: "No hay solicitudes pendientes." },
  { key: "active", title: "Empleados activos", empty: "Todavía no hay empleados activos." },
  { key: "closed", title: "Suspendidos o rechazados", empty: "No hay cuentas suspendidas ni rechazadas." },
]

function groupOf(status: StaffStatus): "pending" | "active" | "closed" {
  if (status === "pending") return "pending"
  if (status === "active") return "active"
  return "closed"
}

function statusLabel(status: StaffStatus) {
  if (status === "pending") return "Pendiente"
  if (status === "active") return "Activo"
  if (status === "suspended") return "Suspendido"
  return "Rechazado"
}

async function send(body: Record<string, unknown>) {
  const response = await fetch("/api/admin/staff/access", {
    method: "POST",
    headers: { "content-type": "application/json", [adminRequestHeader]: adminRequestValue },
    body: JSON.stringify(body),
  })
  const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null
  return result?.ok ? { ok: true as const } : { ok: false as const, message: result?.message || "No pudimos actualizar el acceso." }
}

function StaffRoster({ members }: { members: MemberCard[] }) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState("")
  const [error, setError] = useState("")
  const [roles, setRoles] = useState<Record<string, StaffRole>>({})
  const [confirmOwner, setConfirmOwner] = useState<Record<string, boolean>>({})
  const [confirmRevoke, setConfirmRevoke] = useState("")

  function roleFor(member: MemberCard): StaffRole {
    return roles[member.uid] ?? member.role ?? "admin"
  }

  async function run(uid: string, body: Record<string, unknown>) {
    setPendingId(uid)
    setError("")
    const result = await send(body)
    setPendingId("")
    if (!result.ok) {
      setError(result.message)
      return
    }
    setConfirmRevoke("")
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => {
        const rows = members.filter((member) => groupOf(member.status) === group.key)
        return (
          <section key={group.key} className="flex flex-col gap-3">
            <h2 className="font-heading text-lg font-bold text-olive">{group.title}</h2>
            {rows.length === 0 ? (
              <Text tone="muted">{group.empty}</Text>
            ) : (
              rows.map((member) => {
                const selected = roleFor(member)
                const needsOwnerConfirm = selected === "superadmin" && member.role !== "superadmin"
                return (
                  <article key={member.uid} className="admin-card flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-heading font-bold text-olive">{member.name || "Sin nombre"}</p>
                        <p className="truncate text-sm text-olive-muted">{member.email}</p>
                      </div>
                      <Badge variant={member.status === "active" ? "solid" : "soft"}>{statusLabel(member.status)}</Badge>
                    </div>
                    <p className="text-sm text-olive">
                      Rol: <span className="font-semibold">{member.roleLabel}</span>
                    </p>
                    {member.emailVerified === false && member.status !== "rejected" ? (
                      <p className="text-sm text-terracotta">Debe verificar su correo antes de recibir acceso.</p>
                    ) : null}
                    {member.status === "pending" && member.role ? (
                      <p className="text-sm text-terracotta">
                        Esta cuenta tiene un permiso que no corresponde a una solicitud pendiente. Aprobar lo reemplaza. Rechazar lo quita.
                      </p>
                    ) : null}
                    {member.status === "rejected" ? null : (
                      <label className="flex flex-col gap-2 text-sm font-semibold text-olive">
                        {member.status === "pending" ? "Rol al aprobar" : "Cambiar rol"}
                        <select
                          className="admin-control font-sans font-normal"
                          value={selected}
                          onChange={(event) => setRoles((current) => ({ ...current, [member.uid]: event.target.value === "superadmin" ? "superadmin" : "admin" }))}
                        >
                          <option value="admin">Administración</option>
                          <option value="superadmin">Propietario</option>
                        </select>
                      </label>
                    )}
                    {needsOwnerConfirm ? (
                      <label className="flex min-h-11 items-center gap-3 text-sm text-olive">
                        <input
                          type="checkbox"
                          className="size-5 accent-olive"
                          checked={confirmOwner[member.uid] === true}
                          onChange={(event) => setConfirmOwner((current) => ({ ...current, [member.uid]: event.target.checked }))}
                        />
                        Confirmo que también podrá administrar el personal.
                      </label>
                    ) : null}
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      {member.status === "pending" ? (
                        <>
                          <Button type="button" className="w-full sm:w-auto" loading={pendingId === member.uid} disabled={needsOwnerConfirm && !confirmOwner[member.uid]} onClick={() => run(member.uid, { intent: "approve", uid: member.uid, role: selected, confirmOwner: selected === "superadmin" })}>
                            Aprobar
                          </Button>
                          <Button type="button" variant="secondary" className="w-full sm:w-auto" loading={pendingId === member.uid} onClick={() => run(member.uid, { intent: "reject", uid: member.uid })}>
                            Rechazar
                          </Button>
                        </>
                      ) : null}
                      {member.status === "active" ? (
                        <>
                          <Button type="button" variant="secondary" className="w-full sm:w-auto" loading={pendingId === member.uid} disabled={selected === member.role || (needsOwnerConfirm && !confirmOwner[member.uid])} onClick={() => run(member.uid, { intent: "role", uid: member.uid, role: selected, confirmOwner: selected === "superadmin" })}>
                            Guardar rol
                          </Button>
                          <Button type="button" variant="secondary" className="w-full sm:w-auto" loading={pendingId === member.uid} onClick={() => run(member.uid, { intent: "suspend", uid: member.uid })}>
                            Suspender
                          </Button>
                        </>
                      ) : null}
                      {member.status === "suspended" ? (
                        <Button type="button" className="w-full sm:w-auto" loading={pendingId === member.uid} onClick={() => run(member.uid, { intent: "reactivate", uid: member.uid })}>
                          Reactivar
                        </Button>
                      ) : null}
                      {member.status === "active" || member.status === "suspended" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="w-full sm:w-auto"
                          loading={pendingId === member.uid}
                          onClick={() => {
                            if (confirmRevoke !== member.uid) {
                              setConfirmRevoke(member.uid)
                              return
                            }
                            void run(member.uid, { intent: "revoke", uid: member.uid })
                          }}
                        >
                          {confirmRevoke === member.uid ? "Confirmar revocación" : "Revocar acceso"}
                        </Button>
                      ) : null}
                    </div>
                  </article>
                )
              })
            )}
          </section>
        )
      })}
      {error ? <p className="text-sm font-semibold text-terracotta">{error}</p> : null}
    </div>
  )
}

export { StaffRoster }
export type { MemberCard }
