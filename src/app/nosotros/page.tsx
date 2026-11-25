import type { Metadata } from "next"

import { AboutStory } from "@/components/features/about/about-story"
import { FloatingWhatsApp } from "@/components/features/layout/floating-whatsapp"
import { PublicSiteFooter } from "@/components/features/layout/public-site-footer"
import { SiteHeader } from "@/components/features/site-header"

import "./nosotros.css"

export const metadata: Metadata = {
  title: "Quiénes somos",
  description:
    "Somos Felipe y Camila. PIÙ Pizza & Dolce nació en la cocina de nuestra casa, en Maipú.",
  alternates: { canonical: "/nosotros" },
  openGraph: {
    url: "/nosotros",
    images: [{ url: "/opengraph-image.jpg", width: 1200, height: 630, alt: "El local de PIÙ Pizza & Dolce" }],
    title: "Quiénes somos · PIÙ",
    description: "La historia de Felipe, Camila y PIÙ Pizza & Dolce.",
    locale: "es_CL",
    type: "website",
  },
}

export default function NosotrosPage() {
  return (
    <div className="overflow-x-clip bg-cream">
      <SiteHeader page="nosotros" />
      <FloatingWhatsApp />
      <main className="pt-[calc(env(safe-area-inset-top)+4.5rem)]">
        <AboutStory />
      </main>
      <PublicSiteFooter />
    </div>
  )
}
