import type { Metadata } from "next"

import { EssenceSection } from "@/components/features/home/essence-section"
import { Hero } from "@/components/features/home/hero"
import { MenuSection } from "@/components/features/home/menu-section"
import { ReserveSection } from "@/components/features/home/reserve-section"
import { SiteFooter } from "@/components/features/site-footer"
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
      <div className="overflow-x-clip">
        <main>
          <Hero />
          <EssenceSection />
          <MenuSection />
          <ReserveSection />
        </main>
        <SiteFooter />
      </div>
    </div>
  )
}
