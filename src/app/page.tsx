import type { Metadata } from "next"

import { ChefSuggestions } from "@/components/features/home/chef-suggestions"
import { EssenceSection } from "@/components/features/home/essence-section"
import { Hero } from "@/components/features/home/hero"
import { MenuSection } from "@/components/features/home/menu-section"
import { ReserveSection } from "@/components/features/home/reserve-section"
import { VisitSection } from "@/components/features/home/visit-section"
import { FloatingWhatsApp } from "@/components/features/layout/floating-whatsapp"
import { SiteFooter } from "@/components/features/layout/site-footer"
import { SiteHeader } from "@/components/features/site-header"

import "./home.css"

export const metadata: Metadata = {
  title: { absolute: "PIÙ — Pizza & Dolce" },
  description: "Pizzas artesanales, ingredientes reales y un ambiente pensado para disfrutar sin apuro.",
  openGraph: {
    title: "PIÙ — Pizza & Dolce",
    description: "Pizzas artesanales, ingredientes reales y un ambiente pensado para disfrutar sin apuro.",
    locale: "es_CL",
    type: "website",
  },
}

export default function Home() {
  return (
    <div className="bg-cream">
      <SiteHeader />
      <FloatingWhatsApp />
      <div className="overflow-x-clip">
        <main>
          <Hero />
          <ChefSuggestions />
          <MenuSection />
          <EssenceSection />
          <ReserveSection />
          <VisitSection />
        </main>
        <SiteFooter />
      </div>
    </div>
  )
}
