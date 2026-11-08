import type { Metadata } from "next"

import { Eyebrow, Heading, Text } from "@/components/ui/typography"
import { roleLabel } from "@/lib/auth/permissions"
import { requireSection } from "@/server/auth/access"
import { countCatalogProducts } from "@/server/catalog/service"
import { reservationSummary } from "@/server/reservations/service"

export const instant = false

export const metadata: Metadata = {
  title: "Inicio",
  robots: { index: false, follow: false },
}

export default async function AdminHomePage() {
  const session = await requireSection("inicio")
  const who = session.displayName || session.email || "equipo de PIÙ"
  const [reservations, productCount] = await Promise.all([reservationSummary(session), countCatalogProducts(session)])
  const summary = reservations.summary
  const metrics = [
    { title: "Solicitudes pendientes", value: summary?.pending },
    { title: "Confirmadas para hoy", value: summary?.confirmedToday },
    { title: "Próximas confirmadas", value: summary?.upcoming },
    { title: "Requieren atención", value: summary?.attention },
  ]

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
          {reservations.ready
            ? "Estos números salen de las solicitudes guardadas."
            : "La recepción de reservas sigue desactivada, así que no hay solicitudes reales que contar."}{" "}
          {productCount == null ? "El conteo de productos aparecerá cuando Firestore esté conectado." : "El conteo de productos sale de la carta guardada."}
        </p>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {metrics.map((metric) => (
            <li key={metric.title} className="rounded-xl border border-olive-line bg-surface-raised p-4">
              <p className="font-heading text-base font-bold">{metric.title}</p>
              <p className="mt-3 text-sm font-semibold text-terracotta">
                {reservations.ready ? (metric.value == null ? "No disponible" : metric.value) : "Recepción desactivada"}
              </p>
            </li>
          ))}
          <li className="rounded-xl border border-olive-line bg-surface-raised p-4">
            <p className="font-heading text-base font-bold">Productos del catálogo</p>
            <p className="mt-3 text-sm font-semibold text-terracotta">{productCount == null ? "Aún no conectado" : productCount}</p>
          </li>
        </ul>
      </section>
    </div>
  )
}
