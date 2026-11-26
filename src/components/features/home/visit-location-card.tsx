"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowUpRightIcon, CheckIcon, CopyIcon, MapIcon, MapPinIcon } from "lucide-react"
import { cn } from "cn"

import { MapEmbed } from "@/components/features/home/map-embed"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { HoursLine } from "@/lib/reservations/schedule"
import type { visitVenues } from "@/lib/site"

type VisitVenue = (typeof visitVenues)[number]

function shortDays(label: string) {
  const map: Record<string, string> = {
    "Lunes a jueves": "Lun – jue",
    "Viernes y sábado": "Vie – sáb",
    Domingo: "Domingo",
  }
  return map[label] ?? label
}

function VisitHoursStrip({
  hours,
  showLastSeating,
  note,
}: {
  hours: HoursLine[]
  showLastSeating: boolean
  note?: string | null
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-olive-line bg-surface-raised">
      <p className="border-b border-olive-line px-4 py-2 font-label text-[0.65rem] font-semibold tracking-[0.14em] text-olive-muted uppercase">
        Horario de atención
      </p>
      <div
        className={cn(
          "grid divide-y divide-olive-line sm:divide-x sm:divide-y-0",
          hours.length === 3 ? "sm:grid-cols-3" : hours.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-1"
        )}
      >
        {hours.map((row) => {
          const closed = row.hours === "Cerrado"
          return (
            <div key={row.days} className="flex flex-col items-center px-2 py-2.5 text-center sm:px-4 sm:py-4">
              <p className="font-label text-[0.65rem] font-semibold tracking-[0.14em] text-olive-muted uppercase">
                {shortDays(row.days)}
              </p>
              <p
                className={cn(
                  "mt-1 font-heading text-sm font-bold tabular-nums sm:text-base",
                  closed ? "text-terracotta" : "text-olive"
                )}
              >
                {row.hours}
              </p>
              {showLastSeating && row.lastSeatingTime ? (
                <p className="mt-1 text-[0.65rem] leading-snug text-olive-muted">
                  Reserva en línea hasta {row.lastSeatingTime}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>
      {note ? (
        <p className="border-t border-olive-line px-4 py-3 text-center text-sm leading-snug text-olive-strong">{note}</p>
      ) : null}
    </div>
  )
}

function VisitLocationCard({ location, hours, className }: { location: VisitVenue; hours: HoursLine[]; className?: string }) {
  const [copied, setCopied] = useState(false)
  const address = `${location.street}, ${location.locality}`
  const stripHours = location.scheduleHours ?? hours

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Card
      variant="raised"
      size="feature"
      interactive
      className={cn(
        "[--card-pad:0px] border-olive-line/80 bg-cream shadow-lift transition-[transform,box-shadow] duration-300 sm:[--card-pad:0px] md:hover:-translate-y-0.5 md:hover:shadow-[0_20px_50px_-24px_rgba(22,27,16,0.35)]",
        className
      )}
    >
      <div className="flex flex-col gap-3 p-4 sm:gap-6 sm:p-6 lg:gap-6 lg:p-7">
        <div className="hidden flex-wrap items-center justify-between gap-3 md:flex">
          <span className="inline-flex max-w-full items-center rounded-full bg-olive px-3 py-1 font-label text-[0.65rem] font-semibold tracking-[0.12em] text-cream uppercase sm:text-[0.7rem]">
            {location.badge}
          </span>
          <span className="font-label text-[0.65rem] font-semibold tracking-[0.16em] text-olive-muted uppercase sm:text-xs">
            {location.indexLabel}
          </span>
        </div>

        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <h3 className="font-heading text-xl font-bold leading-tight tracking-[-0.02em] text-olive sm:text-[clamp(1.25rem,4vw,1.6rem)]">
            {location.name}
          </h3>
          <button
            type="button"
            onClick={() => void copyAddress()}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-olive-line bg-surface-raised text-olive outline-none transition-colors hover:border-olive-soft hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
            aria-label={copied ? "Dirección copiada" : "Copiar dirección"}
          >
            {copied ? <CheckIcon className="size-4 text-terracotta" aria-hidden /> : <CopyIcon className="size-4" aria-hidden />}
          </button>
        </div>

        <a
          href={location.mapsSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group/addr flex items-start gap-2 rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-olive"
        >
          <MapPinIcon className="mt-0.5 size-4 shrink-0 text-terracotta" aria-hidden />
          <span className="text-[0.9375rem] leading-snug text-olive-strong transition-colors group-hover/addr:text-olive sm:text-base">
            {location.street}
            <span className="hidden text-olive-muted sm:inline"> · {location.locality}</span>
            <span className="block text-sm text-olive-muted sm:hidden">{location.locality}</span>
          </span>
        </a>

        <p className="hidden rounded-xl border border-olive-line/60 bg-surface-raised/80 px-4 py-3 text-sm leading-snug text-olive md:block">
          <MapPinIcon className="mr-1.5 inline size-3.5 text-terracotta-soft align-[-0.15em]" aria-hidden />
          {location.landmark}
        </p>

        <ul className="hidden flex-wrap gap-2 md:flex" aria-label={`Características de ${location.name}`}>
          {location.highlights.map((item) => (
            <li
              key={item}
              className={cn(
                "rounded-full border border-olive-line bg-cream px-3 py-1 font-label text-xs font-semibold text-olive",
                item.toLowerCase().includes("reserva") && "border-terracotta-soft/60 bg-[color-mix(in_srgb,var(--brand-terracotta),transparent_88%)] text-terracotta"
              )}
            >
              {item}
            </li>
          ))}
        </ul>

        <div className="group/map relative -mx-1 overflow-hidden rounded-2xl ring-1 ring-olive-line/80 ring-inset sm:mx-0">
          <MapEmbed
            src={location.mapsEmbedUrl}
            title={`Mapa de ${location.name} en ${location.street}, ${location.locality}`}
            className="h-[min(58vw,19rem)] min-h-[13.5rem] transition-[filter] duration-300 group-hover/map:brightness-[1.02] sm:h-[16rem] md:min-h-0 lg:h-[15.5rem]"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-linear-to-t from-olive/30 via-olive/5 to-transparent md:from-olive/25"
            aria-hidden
          />
          <a
            href={location.mapsSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute right-3 bottom-3 left-3 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-cream/95 px-4 text-sm font-semibold text-olive shadow-lift backdrop-blur-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive md:hidden"
          >
            Abrir en Google Maps
            <ArrowUpRightIcon className="size-4" aria-hidden />
          </a>
          <div className="absolute inset-x-3 bottom-3 hidden gap-2 min-[420px]:flex-row min-[420px]:items-stretch min-[420px]:justify-between md:flex">
            <a
              href={location.mapsSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-olive px-4 text-sm font-semibold text-cream shadow-tactile outline-none transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
            >
              <MapIcon className="size-4" aria-hidden />
              Ver mapa
            </a>
            <a
              href={location.mapsSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-cream/95 px-4 text-sm font-semibold text-olive shadow-lift backdrop-blur-sm outline-none transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
            >
              Google Maps
              <ArrowUpRightIcon className="size-4" aria-hidden />
            </a>
          </div>
        </div>

        <VisitHoursStrip
          hours={stripHours}
          showLastSeating={location.showLastSeating}
          note={location.hoursNote}
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <Button variant="accent" size="lg" className="h-12 min-h-11 flex-1 shadow-tactile" asChild>
            <a href={location.directionsUrl} target="_blank" rel="noopener noreferrer">
              <MapPinIcon aria-hidden />
              Cómo llegar
            </a>
          </Button>
          {location.reserveExternal ? (
            <Button variant="primary" size="lg" className="h-12 min-h-11 flex-1" asChild>
              <a href={location.reserveHref} target="_blank" rel="noopener noreferrer">
                {location.reserveLabel}
                <ArrowUpRightIcon className="size-4" aria-hidden />
              </a>
            </Button>
          ) : (
            <Button variant="primary" size="lg" className="h-12 min-h-11 flex-1" asChild>
              <Link href={location.reserveHref}>{location.reserveLabel}</Link>
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

export { VisitLocationCard }