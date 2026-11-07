import { importFudoCatalog } from "@/server/catalog/import"

const result = await importFudoCatalog()
console.log(`Categorías: ${result.categories}. Productos: ${result.products}.`)
