import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { LoginForm } from "@/components/features/admin/login-form"
import { Logo } from "@/components/ui/logo"
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
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8">
        <div className="flex flex-col items-start gap-4">
          <Logo size={56} priority alt="PIÙ" />
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
