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
  { days: "Lunes a jueves", hours: "17:00 – 22:00 hrs." },
  { days: "Viernes y sábado", hours: "13:00 – 23:00 hrs." },
  { days: "Domingo", hours: "Cerrado" },
] as const

const footerNav = [
  { href: "/#inicio", label: "Inicio" },
  { href: "/#carta", label: "Carta" },
  { href: "/#reservas", label: "Reservas" },
  { href: "/#esencia", label: "Nosotros" },
] as const

export { footerNav, openingHours, socialLinks, whatsappHref, whatsappMessage }
