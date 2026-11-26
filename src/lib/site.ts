import type { HoursLine } from "@/lib/reservations/schedule"

/** Dominio público. Lo usan los metadatos, el sitemap y los datos estructurados. */
const siteUrl = "https://piupizzas.cl"

/** Local de reservas y datos estructurados (Restaurant Più Pizzas). */
const venue = {
  name: "PIÙ Pizza & Dolce",
  street: "Primera Transversal 2595",
  locality: "Maipú, Región Metropolitana",
  country: "Chile",
  mapsQuery: "Primera Transversal 2595, Maipú, Región Metropolitana, Chile",
} as const

const mapsEmbedUrl =
  "https://www.google.com/maps/embed?origin=mfe&pb=!1m3!2m1!1sPrimera+Transversal+2595,+Maip%C3%BA,+Regi%C3%B3n+Metropolitana,+Chile!6i15!3m1!1ses!5m1!1ses"

/** Perfil/lugar en Google Maps (nombre + dirección, para que abra la ficha del local). */
const mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`PIÙ Pizza & Dolce, ${venue.mapsQuery}`)}`

const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(venue.mapsQuery)}`

function mapsSearchFor(name: string, mapsQuery: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, ${mapsQuery}`)}`
}

function directionsFor(mapsQuery: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapsQuery)}`
}

function whatsappChat(phone: string, message: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

const casaVisitHours: HoursLine[] = [
  { days: "Lunes a jueves", hours: "17:00–22:00 hrs.", lastSeatingTime: null },
  { days: "Viernes y sábado", hours: "14:00–22:00 hrs.", lastSeatingTime: null },
]

/** Direcciones y mapas de la sección Visítanos en el inicio. */
const visitVenues = [
  {
    id: "restaurant",
    name: "Restaurant Più Pizzas",
    street: "Primera Transversal 2595",
    locality: "Maipú, Región Metropolitana",
    mapsQuery: "Primera Transversal 2595, Maipú, Región Metropolitana, Chile",
    mapsEmbedUrl,
    mapsSearchUrl: mapsSearchFor("Restaurant Più Pizzas", "Primera Transversal 2595, Maipú, Región Metropolitana, Chile"),
    directionsUrl: directionsFor("Primera Transversal 2595, Maipú, Región Metropolitana, Chile"),
    badge: "Salón principal · Horno a la vista",
    indexLabel: "01 · Maipú centro",
    landmark: "A pasos del Estadio Santiago Bueras y la Plaza de Maipú.",
    highlights: ["Mesas familiares", "Terraza y barra", "Reservas en línea"] as const,
    reserveHref: "/reservas",
    reserveLabel: "Reservar mesa",
    reserveExternal: false,
    scheduleHours: null,
    showLastSeating: true,
    hoursNote: null,
  },
  {
    id: "casa",
    name: "Casa Più",
    street: "Av. Santa Rosa 63",
    locality: "Maipú, Región Metropolitana",
    mapsQuery: "Av. Santa Rosa 63, Maipú, Región Metropolitana, Chile",
    mapsEmbedUrl:
      "https://www.google.com/maps/embed?origin=mfe&pb=!1m3!2m1!1sAv.+Santa+Rosa+63,+Maip%C3%BA,+Regi%C3%B3n+Metropolitana,+Chile!6i15!3m1!1ses!5m1!1ses",
    mapsSearchUrl: mapsSearchFor("Casa Più", "Av. Santa Rosa 63, Maipú, Región Metropolitana, Chile"),
    directionsUrl: directionsFor("Av. Santa Rosa 63, Maipú, Región Metropolitana, Chile"),
    badge: "Casa Più · Pizzas y dolce",
    indexLabel: "02 · Santa Rosa",
    landmark: "Entre Metro Monte Tabor y Las Parcelas.",
    highlights: ["Pizzas, dolce y café", "Para compartir"] as const,
    reserveHref: whatsappChat("56927214013", "Hola, quiero consultar por Casa Più."),
    reserveLabel: "Escribir por WhatsApp",
    reserveExternal: true,
    scheduleHours: casaVisitHours,
    showLastSeating: false,
    hoursNote: "Sin reservas en línea. Escríbenos por WhatsApp.",
  },
] as const

const whatsappMessage = "Hola, tengo una consulta sobre PIÙ Pizza & Dolce."

const whatsappHref = `https://wa.me/56928873619?text=${encodeURIComponent(whatsappMessage)}`

/** Locales que se eligen desde la burbuja de ayuda. El de reservas sigue en `whatsappHref`. */
const whatsappVenues = [
  {
    id: "casa",
    name: "Casa Più",
    href: whatsappChat("56927214013", "Hola, tengo una consulta para Casa Più."),
  },
  {
    id: "restaurant",
    name: "Restaurant Più Pizzas",
    href: whatsappChat("56928873619", "Hola, tengo una consulta para Restaurant Più Pizzas."),
  },
] as const

const socialLinks = [
  {
    id: "instagram-restaurant",
    name: "Instagram",
    label: "Instagram de Restaurant Più Pizzas",
    href: "https://www.instagram.com/piupizzas.cl/?hl=es",
    icon: "/logos/instagram.png",
  },
  {
    id: "instagram-casa",
    name: "Instagram",
    label: "Instagram de Casa Più",
    href: "https://www.instagram.com/casapiu.cl/?hl=es",
    icon: "/logos/instagram.png",
  },
  {
    id: "tiktok",
    name: "TikTok",
    label: "TikTok de PIÙ",
    href: "https://www.tiktok.com/@piupizzas.cl",
    icon: "/logos/tiktok.avif",
  },
] as const

const footerNav = [
  { href: "/#inicio", label: "Inicio" },
  { href: "/carta", label: "Carta" },
  { href: "/reservas", label: "Reservas" },
  { href: "/nosotros", label: "Nosotros" },
] as const

export {
  directionsUrl,
  footerNav,
  mapsEmbedUrl,
  mapsSearchUrl,
  siteUrl,
  socialLinks,
  venue,
  visitVenues,
  whatsappHref,
  whatsappMessage,
  whatsappVenues,
}