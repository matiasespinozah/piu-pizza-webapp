import type { Metadata } from "next"

import { Eyebrow, Heading, Text } from "@/components/ui/typography"
import { roleLabel } from "@/lib/auth/permissions"
import { requireSection } from "@/server/auth/access"

export const instant = false

export const metadata: Metadata = {
  title: "Inicio",
  robots: { index: false, follow: false },
}

const metrics = [
  {
    title: "Reservas pendientes",
    note: "Aún no conectado",
  },
  {
    title: "Reservas confirmadas",
    note: "Aún no conectado",
  },
  {
    title: "Próximas reservas",
    note: "Aún no conectado",
  },
  {
    title: "Productos del catálogo",
    note: "Aún no conectado",
  },
] as const

export default async function AdminHomePage() {
  const session = await requireSection("inicio")
  const who = session.displayName || session.email || "equipo de PIÙ"

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Eyebrow>PIÙ · equipo</Eyebrow>
        <Heading as="h1" size="h3">
          Bienvenido al panel de PIÙ
        </Heading>
        <Text>
          {who}
          <span className="text-olive-muted"> · {roleLabel(session.role)}</span>
        </Text>
      </header>

      <section aria-labelledby="admin-metrics-title" className="flex flex-col gap-3">
        <h2 id="admin-metrics-title" className="font-heading text-lg font-bold">
          Resumen
        </h2>
        <p className="max-w-2xl text-sm text-olive-muted">
          Las métricas estarán disponibles al conectar el módulo de reservas. El conteo de productos
          aparecerá cuando el catálogo del panel esté conectado. La carta pública no cambia.
        </p>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {metrics.map((metric) => (
            <li key={metric.title} className="rounded-xl border border-olive-line bg-surface-raised p-4">
              <p className="font-heading text-base font-bold">{metric.title}</p>
              <p className="mt-3 text-sm font-semibold text-terracotta">{metric.note}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
