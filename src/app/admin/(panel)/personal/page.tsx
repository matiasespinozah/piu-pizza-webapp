import type { Metadata } from "next"

import { StaffInviteForm } from "@/components/features/admin/staff/staff-invite-form"
import { StaffInviteList, type InvitationCard } from "@/components/features/admin/staff/staff-invite-list"
import { StaffRoster, type MemberCard } from "@/components/features/admin/staff/staff-roster"
import { Heading, Text } from "@/components/ui/typography"
import { requireSection } from "@/server/auth/access"
import { listStaffMembers } from "@/server/staff/access"
import { listStaffInvitations } from "@/server/staff/invitations"

export const instant = false

export const metadata: Metadata = {
  title: "Personal",
  robots: { index: false, follow: false },
}

function whenLabel(iso: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Santiago",
  }).format(new Date(iso))
}

export default async function AdminPersonalPage() {
  const session = await requireSection("personal")

  let invites
  let members: MemberCard[]
  try {
    invites = await listStaffInvitations(session)
    members = await listStaffMembers(session)
  } catch (error) {
    if (error instanceof Error && error.message.includes("Firestore está apagado")) {
      return (
        <section className="mx-auto flex w-full max-w-3xl flex-col gap-3">
          <Heading as="h1" size="h3">
            Personal
          </Heading>
          <Text>
            Las invitaciones escriben en Firestore. En este servidor el acceso está apagado, así que desde aquí no se crea ninguna
            cuenta. Para ensayarlas usa el emulador, sin encender el proyecto real.
          </Text>
        </section>
      )
    }
    throw error
  }
  const cards: InvitationCard[] = invites.map((invite) => ({
    id: invite.id,
    email: invite.email,
    phase: invite.phase,
    when: whenLabel(invite.phase === "used" && invite.usedAt ? invite.usedAt : invite.expiresAt),
  }))

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Heading as="h1" size="h3">
          Personal
        </Heading>
        <Text tone="muted">Invita a un trabajador y aprueba su acceso. La cuenta no entra al panel hasta que le asignes un rol.</Text>
      </div>
      <StaffInviteForm />
      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-bold text-olive">Invitaciones</h2>
        <StaffInviteList invites={cards} />
      </div>
      <StaffRoster members={members} />
    </section>
  )
}
