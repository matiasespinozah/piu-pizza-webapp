import type { WeekSchedule } from "@/lib/reservations/schedule"
import { siteUrl, socialLinks, venue } from "@/lib/site"

/**
 * Datos estructurados del local para Google (Restaurant).
 * Solo datos que el sitio ya muestra. El horario sale de la misma lectura cacheada que el pie
 * de página, así que sigue lo que se configura en el panel.
 */
const schemaDays = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
} as const

/** Agrupa los días abiertos con el mismo horario. Un día cerrado no aparece. */
function openingHours(week: WeekSchedule) {
  const groups = new Map<string, { dayOfWeek: string[]; opens: string; closes: string }>()
  for (const id of Object.keys(schemaDays) as (keyof typeof schemaDays)[]) {
    const day = week[id]
    if (!day?.open) continue
    const key = `${day.opensAt}-${day.closesAt}`
    const group = groups.get(key) ?? { dayOfWeek: [], opens: day.opensAt, closes: day.closesAt }
    group.dayOfWeek.push(schemaDays[id])
    groups.set(key, group)
  }
  return [...groups.values()].map((group) => ({ "@type": "OpeningHoursSpecification", ...group }))
}

const base = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "@id": `${siteUrl}/#restaurante`,
  name: venue.name,
  url: siteUrl,
  image: `${siteUrl}/opengraph-image.jpg`,
  logo: `${siteUrl}/icon.png`,
  telephone: "+56928873619",
  servesCuisine: ["Pizza", "Postres"],
  acceptsReservations: `${siteUrl}/reservas`,
  hasMenu: `${siteUrl}/carta`,
  address: {
    "@type": "PostalAddress",
    streetAddress: venue.street,
    addressLocality: "Maipú",
    addressRegion: "Región Metropolitana",
    addressCountry: "CL",
  },
  sameAs: socialLinks.map((link) => link.href),
}

function RestaurantJsonLd({ week }: { week: WeekSchedule }) {
  const restaurant = { ...base, openingHoursSpecification: openingHours(week) }
  // `<` escapado: el contenido nunca puede cerrar la etiqueta <script>.
  const json = JSON.stringify(restaurant).replace(/</g, "\\u003c")
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}

export { RestaurantJsonLd }
