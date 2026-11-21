import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Heading, Text } from "@/components/ui/typography"
import { averageStaySeconds } from "@/lib/metrics/carta-visit"
import { requireSection } from "@/server/auth/access"
import { readCartaVisits } from "@/server/metrics/carta"

export const instant = false

export const metadata: Metadata = {
  title: "Medicion de pruebas",
  robots: { index: false, follow: false },
}

function clock(seconds: number) {
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`
}

export default async function CartaMetricsPage() {
  await requireSection("metricas")
  const visits = await readCartaVisits().catch(() => null)
  const opens = visits?.opens ?? 0
  const engaged = visits?.engagedSeconds ?? 0
  const average = averageStaySeconds(opens, engaged)

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <Button asChild variant="ghost" size="sm" className="h-11 self-start px-0">
        <Link href="/admin">Volver al dashboard</Link>
      </Button>
      <header className="flex flex-col gap-1">
        <Heading as="h1" size="h3">
          Medicion de pruebas
        </Heading>
        <Text tone="muted">Visitas de hoy en la carta. {visits?.day ?? ""}</Text>
      </header>
      {!visits?.ready ? (
        <p className="rounded-xl bg-olive-hover px-4 py-3 text-base">En este entorno la medición no escribe en Firestore.</p>
      ) : null}
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-olive-line bg-surface-raised px-4 py-4">
          <dt className="text-sm text-olive-muted">Visitas</dt>
          <dd className="font-heading text-3xl font-extrabold text-olive">{opens}</dd>
        </div>
        <div className="rounded-2xl border border-olive-line bg-surface-raised px-4 py-4">
          <dt className="text-sm text-olive-muted">Tiempo visible</dt>
          <dd className="font-heading text-3xl font-extrabold text-olive">{clock(engaged)}</dd>
        </div>
        <div className="rounded-2xl border border-olive-line bg-surface-raised px-4 py-4">
          <dt className="text-sm text-olive-muted">Tiempo medio</dt>
          <dd className="font-heading text-3xl font-extrabold text-olive">{opens > 0 ? clock(average) : "0 s"}</dd>
        </div>
      </dl>
      <Text size="sm" tone="muted">
        Una visita cuenta cuando la carta estuvo visible al menos un segundo. El tiempo es el rato en que la pestaña estuvo al frente. No se guarda una cookie ni un identificador de la persona.
      </Text>
    </section>
  )
}
