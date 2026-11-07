import type { Metadata } from "next"

import { FloatingWhatsApp } from "@/components/features/layout/floating-whatsapp"
import { SiteFooter } from "@/components/features/layout/site-footer"
import { MenuExplorer } from "@/components/features/menu/menu-explorer"
import { MenuHeader } from "@/components/features/menu/menu-header"
import { SiteHeader } from "@/components/features/site-header"
import { getPublicCatalog } from "@/server/dal/catalog"

import "../home.css"

export const metadata: Metadata = {
  title: "Carta",
  description: "Explora la carta de PIÙ Pizza & Dolce: sabores para compartir, momentos para recordar.",
  openGraph: {
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
      <FloatingWhatsApp />
      <div className="overflow-x-clip">
        <main className="pt-[calc(env(safe-area-inset-top)+4rem)]">
          <MenuHeader />
          <MenuExplorer categories={categories} products={products} />
        </main>
        <SiteFooter />
      </div>
    </div>
  )
}
