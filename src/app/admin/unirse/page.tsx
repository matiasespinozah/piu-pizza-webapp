import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

import { JoinForm } from "@/components/features/admin/staff/join-form"
import { Heading, Text } from "@/components/ui/typography"

export const metadata: Metadata = {
  title: "Crear cuenta de equipo",
  description: "Alta privada para el equipo de PIÙ",
  robots: { index: false, follow: false },
}

export default function JoinStaffPage() {
  return (
    <main className="flex min-h-svh flex-col bg-background px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="mb-[5%] h-[4.5rem] w-[9.9rem] overflow-hidden">
            <Image
              src="/logos/logopiu.png"
              alt="PIÙ"
              width={1254}
              height={1254}
              priority
              quality={75}
              sizes="160px"
              className="h-full w-full object-cover object-center"
            />
          </div>
          <Heading as="h1" size="h3">
            Cuenta de equipo
          </Heading>
          <Text tone="muted">La invitación no da acceso al panel hasta que el propietario la apruebe.</Text>
        </div>
        <section className="rounded-xl border border-olive-line bg-surface-raised p-4 shadow-lift sm:p-6">
          <JoinForm />
        </section>
        <Link href="/" className="inline-flex min-h-11 items-center self-start text-sm font-semibold text-olive-muted underline-offset-4 hover:text-foreground hover:underline">
          Volver al sitio
        </Link>
      </div>
    </main>
  )
}
