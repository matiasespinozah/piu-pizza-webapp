import type { Metadata } from "next"

import { ChefSuggestions } from "@/components/features/home/chef-suggestions"
import { getChefSuggestions } from "@/server/dal/catalog"
import { EssenceSection } from "@/components/features/home/essence-section"
import { Hero } from "@/components/features/home/hero"
import { ReserveSection } from "@/components/features/home/reserve-section"
import { VisitSection } from "@/components/features/home/visit-section"
import { FloatingWhatsApp } from "@/components/features/layout/floating-whatsapp"
import { PublicSiteFooter } from "@/components/features/layout/public-site-footer"
import { VisitMeter } from "@/components/features/metrics/visit-meter"
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

export default async function Home() {
  const suggestions = await getChefSuggestions()

  return (
    <div className="bg-cream">
      <SiteHeader />
      <FloatingWhatsApp />
      <div className="overflow-x-clip">
        <main>
          <VisitMeter surface="home" />
          <Hero />
          <ChefSuggestions suggestions={suggestions} />
          <EssenceSection />
          <ReserveSection />
          <VisitSection />
        </main>
        <PublicSiteFooter />
      </div>
    </div>
  )
}
