import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"

import { LoginForm } from "@/components/features/admin/login-form"
import { Heading, Text } from "@/components/ui/typography"
import { readStaffSession } from "@/server/auth/session"

export const instant = false

export const metadata: Metadata = {
  title: "Panel de administración",
  description: "Acceso exclusivo para el equipo de PIÙ",
  robots: { index: false, follow: false },
}

export default async function AdminLoginPage() {
  const session = await readStaffSession()
  if (session) redirect("/admin")

  return (
    <main className="flex min-h-svh flex-col bg-background px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="mb-[5%] h-[4.5rem] w-[9.9rem] overflow-hidden md:h-[6.3rem] md:w-[14.4rem]">
            <Image
              src="/logos/logopiu.png"
              alt="PIÙ"
              width={1254}
              height={1254}
              priority
              quality={90}
              sizes="256px"
              className="h-full w-full object-cover object-center"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Heading as="h1" size="h3">
              Panel de administración
            </Heading>
            <Text tone="muted">Acceso exclusivo para el equipo de PIÙ</Text>
          </div>
        </div>

        <section className="rounded-xl border border-olive-line bg-surface-raised p-4 shadow-lift sm:p-6">
          <LoginForm />
        </section>

        <Link
          href="/"
          className="self-start text-sm font-semibold text-olive-muted underline-offset-4 hover:text-foreground hover:underline"
        >
          Volver al sitio
        </Link>
      </div>
    </main>
  )
}
