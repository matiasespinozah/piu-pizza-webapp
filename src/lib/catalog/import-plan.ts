import { z } from "zod"

import { catalogSlug } from "@/lib/catalog/slug"

const productionProjectId = "piu-pizza-cl"
const chefCategoryName = "SUGERENCIAS DEL CHEF"

const sourceProductSchema = z.object({
  source_key: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(80),
  price_clp: z.number().int().nonnegative(),
  description: z.string().max(500).nullable(),
  availability: z.enum(["listed", "out_of_stock"]),
  image_url: z.string().nullable(),
})

const sourceCategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  sort_order: z.number().int(),
  products: z.array(sourceProductSchema),
})

const sourceCatalogSchema = z.object({
  currency: z.literal("CLP"),
  counts: z.object({
    categories: z.literal(14),
    entries: z.literal(131),
    images_with_real_verified_photo: z.literal(0),
  }),
  categories: z.array(sourceCategorySchema).length(14),
})

type CatalogCategoryDraft = {
  id: string
  slug: string
  name: string
  description: null
  sortOrder: number
  isVisible: boolean
}

type CatalogProductDraft = {
  id: string
  categoryId: string
  name: string
  description: string
  priceClp: number
  imageUrl: null
  availability: "available" | "unavailable"
  isFeatured: boolean
  isVisible: boolean
  sortOrder: number
}

type CatalogImportPlan = {
  categories: CatalogCategoryDraft[]
  products: CatalogProductDraft[]
}

function catalogImportAllowed(env: Record<string, string | undefined> = process.env) {
  const project = env.GOOGLE_CLOUD_PROJECT || env.GCLOUD_PROJECT || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || ""
  if (!project) return false
  if (env.FIRESTORE_EMULATOR_HOST) return project.startsWith("demo-") && project !== productionProjectId
  if (project === productionProjectId) return env.PIU_CATALOG_IMPORT_PRODUCTION === "on"
  return env.PIU_APP_ENV === "staging" && env.PIU_EXPECTED_FIREBASE_PROJECT === project
}

function planCatalogImport(input: unknown): CatalogImportPlan {
  const parsed = sourceCatalogSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error("El archivo del catálogo no tiene la forma esperada.")
  }

  const categories: CatalogCategoryDraft[] = []
  const products: CatalogProductDraft[] = []
  const slugs = new Set<string>()
  const ids = new Set<string>()

  for (const category of parsed.data.categories) {
    const slug = catalogSlug(category.name)
    if (!slug || slugs.has(slug)) throw new Error("Hay categorías repetidas o sin identificador.")
    slugs.add(slug)
    categories.push({
      id: slug,
      slug,
      name: category.name,
      description: null,
      sortOrder: category.sort_order,
      isVisible: true,
    })

    category.products.forEach((product, index) => {
      if (ids.has(product.source_key)) throw new Error("Hay productos repetidos en el archivo.")
      ids.add(product.source_key)
      products.push({
        id: product.source_key,
        categoryId: slug,
        name: product.name,
        description: product.description?.trim() ?? "",
        priceClp: product.price_clp,
        imageUrl: null,
        availability: product.availability === "listed" ? "available" : "unavailable",
        isFeatured: category.name === chefCategoryName,
        isVisible: true,
        sortOrder: index + 1,
      })
    })
  }

  if (categories.length !== 14 || products.length !== 131) {
    throw new Error("El archivo no trae 14 categorías y 131 productos.")
  }

  return { categories, products }
}

export { catalogImportAllowed, chefCategoryName, planCatalogImport, productionProjectId }
export type { CatalogImportPlan, CatalogProductDraft }
