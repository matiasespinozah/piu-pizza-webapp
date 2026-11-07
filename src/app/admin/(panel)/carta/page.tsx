import type { Metadata } from "next"

import { CatalogEditor } from "@/components/features/admin/catalog/catalog-editor"
import { Heading, Text } from "@/components/ui/typography"
import { requireSection } from "@/server/auth/access"
import { readCatalogEditor } from "@/server/catalog/service"

export const instant = false

export const metadata: Metadata = {
  title: "Carta",
  robots: { index: false, follow: false },
}

export default async function AdminCartaPage() {
  const session = await requireSection("carta")

  const catalog = await readCatalogEditor(session)
  if (!catalog) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-3">
        <Heading as="h1" size="h3">
          Carta
        </Heading>
        <Text>
          Este proceso no está conectado a Firestore. La carta pública sigue con el catálogo local y aquí no se escribe en producción. Para editar, usa el emulador o el entorno de pruebas.
        </Text>
      </section>
    )
  }

  return <CatalogEditor categories={catalog.categories} products={catalog.products} />
}
