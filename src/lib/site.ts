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

const whatsappMessage = "Hola, tengo una consulta sobre PIÙ Pizza & Dolce."

const whatsappHref = `https://wa.me/56928873619?text=${encodeURIComponent(whatsappMessage)}`

const socialLinks = [
  {
    name: "Instagram",
    href: "https://www.instagram.com/piupizzas.cl/?hl=es",
    icon: "/logos/instagram.png",
  },
  {
    name: "TikTok",
    href: "https://www.tiktok.com/@piupizzas.cl",
    icon: "/logos/tiktok.avif",
  },
] as const

const openingHours = [
  { days: "Lunes a jueves", hours: "17:00–22:00 hrs." },
  { days: "Viernes y sábado", hours: "13:00–23:00 hrs." },
  { days: "Domingo", hours: "Cerrado" },
] as const

const footerNav = [
  { href: "/#inicio", label: "Inicio" },
  { href: "/carta", label: "Carta" },
  { href: "/reservas", label: "Reservas" },
  { href: "/#esencia", label: "Nosotros" },
] as const

export {
  directionsUrl,
  footerNav,
  mapsEmbedUrl,
  mapsSearchUrl,
  openingHours,
  socialLinks,
  venue,
  whatsappHref,
  whatsappMessage,
}
