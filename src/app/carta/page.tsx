import type { Metadata } from "next"

import { PublicSiteFooter } from "@/components/features/layout/public-site-footer"
import { CartaVisitMeter } from "@/components/features/menu/carta-visit"
import { MenuExplorer } from "@/components/features/menu/menu-explorer"
import { MenuHeader } from "@/components/features/menu/menu-header"
import { SiteHeader } from "@/components/features/site-header"
import { getPublicCatalog } from "@/server/dal/catalog"

import "../home.css"

export const metadata: Metadata = {
  title: "Carta",
  description: "Explora la carta de PIÙ Pizza & Dolce: sabores para compartir, momentos para recordar.",
  alternates: { canonical: "/carta" },
  openGraph: {
    url: "/carta",
    images: [{ url: "/opengraph-image.jpg", width: 1200, height: 630, alt: "El local de PIÙ Pizza & Dolce" }],
    title: "Carta · PIÙ",
    description: "Explora la carta de PIÙ Pizza & Dolce.",
    locale: "es_CL",
    type: "website",
  },
}

export default async function CartaPage() {
  const { categories, products } = await getPublicCatalog()

  return (
    <div className="bg-cream">
      <SiteHeader page="carta" />
      <div className="overflow-x-clip">
        <main className="pt-[calc(env(safe-area-inset-top)+4rem)]">
          <MenuHeader />
          <CartaVisitMeter />
          <MenuExplorer categories={categories} products={products} />
        </main>
        <PublicSiteFooter />
      </div>
    </div>
  )
}
