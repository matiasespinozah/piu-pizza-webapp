import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Heading, Text } from "@/components/ui/typography"
import { averageStaySeconds } from "@/lib/metrics/carta-visit"
import { requireSection } from "@/server/auth/access"
import { readDayMetrics } from "@/server/metrics/visits"

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

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-olive-line bg-surface-raised px-4 py-4">
      <dt className="text-sm text-olive-muted">{label}</dt>
      <dd className="font-heading text-3xl font-extrabold text-olive">{value}</dd>
    </div>
  )
}

function stay(opens: number, seconds: number) {
  return opens > 0 ? clock(averageStaySeconds(opens, seconds)) : "0 s"
}

export default async function MetricsPage() {
  await requireSection("metricas")
  const day = await readDayMetrics().catch(() => null)
  const homeOpens = day?.homeOpens ?? 0
  const cartaOpens = day?.cartaOpens ?? 0
  const reservationOpens = day?.reservationOpens ?? 0
  const savedSamples = day?.reservationSavedSamples ?? 0

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="h-11 self-start px-0">
        <Link href="/admin">Volver al dashboard</Link>
      </Button>
      <header className="flex flex-col gap-1">
        <Heading as="h1" size="h3">
          Medicion de pruebas
        </Heading>
        <Text tone="muted">Visitas de hoy. {day?.day ?? ""}</Text>
      </header>
      {!day?.ready ? (
        <p className="rounded-xl bg-olive-hover px-4 py-3 text-base">En este entorno la medición no escribe en Firestore.</p>
      ) : null}

      <section className="flex flex-col gap-3">
        <Heading as="h2" size="h4">
          Inicio
        </Heading>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Figure label="Visitas" value={String(homeOpens)} />
          <Figure label="Tiempo visible" value={clock(day?.homeSeconds ?? 0)} />
          <Figure label="Tiempo medio" value={stay(homeOpens, day?.homeSeconds ?? 0)} />
        </dl>
      </section>

      <section className="flex flex-col gap-3">
        <Heading as="h2" size="h4">
          Carta
        </Heading>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Figure label="Visitas" value={String(cartaOpens)} />
          <Figure label="Tiempo visible" value={clock(day?.cartaSeconds ?? 0)} />
          <Figure label="Tiempo medio" value={stay(cartaOpens, day?.cartaSeconds ?? 0)} />
        </dl>
      </section>

      <section className="flex flex-col gap-3">
        <Heading as="h2" size="h4">
          Reservas
        </Heading>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Figure label="Entraron" value={String(reservationOpens)} />
          <Figure label="Llegaron a Tus datos" value={String(day?.reservationReached ?? 0)} />
          <Figure label="Reservaron" value={String(day?.reservationSaved ?? 0)} />
          <Figure label="Tiempo medio en la página" value={stay(reservationOpens, day?.reservationSeconds ?? 0)} />
          <Figure
            label="Tiempo medio hasta enviar"
            value={savedSamples > 0 ? clock(averageStaySeconds(savedSamples, day?.reservationSavedSeconds ?? 0)) : "0 s"}
          />
        </dl>
      </section>

      <Text size="sm" tone="muted">
        Una visita cuenta cuando la página estuvo al frente al menos un segundo. El tiempo es el rato en que la pestaña estuvo visible. Cada visita escribe una sola vez, al salir. Reservaron se suma en el servidor solo si la solicitud quedó guardada. No se guarda una cookie ni un identificador de la persona.
      </Text>
    </section>
  )
}
