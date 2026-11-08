import { readFileSync } from "node:fs"
import test from "node:test"
import assert from "node:assert/strict"

import { catalogImportAllowed, planCatalogImport } from "@/lib/catalog/import-plan"
import { isCatalogPhotoUrl } from "@/lib/catalog/photos"
import { prepareProductImage } from "@/server/catalog/images"
import sharp from "sharp"

const catalog = JSON.parse(readFileSync(new URL("../data/catalog/piu-catalogo-fudo.json", import.meta.url), "utf8"))

test("el archivo de Fudo arma 14 categorías y 131 productos sin fotos inventadas", () => {
  const plan = planCatalogImport(catalog)
  assert.equal(plan.categories.length, 14)
  assert.equal(plan.products.length, 131)
  assert.equal(new Set(plan.products.map((product) => product.id)).size, 131)
  assert.equal(plan.products.filter((product) => product.availability === "unavailable").length, 7)
  assert.equal(plan.products.every((product) => product.imageUrl === null), true)
  const chef = plan.products.filter((product) => product.isFeatured)
  assert.deepEqual(
    chef.map((product) => product.name),
    ["Americana", "Pollo Espinaca", "Caramel FungHi"]
  )
  assert.equal(plan.categories.some((category) => category.name === "BEBIDAS"), true)
  assert.equal(plan.categories.some((category) => category.name === "SUGERENCIAS DEL CHEF"), true)
  const juice = plan.products.find((product) => product.id === "piu-01-001-jugo-natural-fram")
  assert.equal(juice?.name, "JugO Natural Fram")
  assert.equal(juice?.priceClp, 3500)
  assert.equal(juice?.description, "Frambuesa, chirimoya, maracuyá")
})

test("la importación de producción exige una autorización aparte", () => {
  assert.equal(catalogImportAllowed({}), false)
  assert.equal(catalogImportAllowed({ GOOGLE_CLOUD_PROJECT: "piu-pizza-cl", PIU_FIREBASE_DATA: "on" }), false)
  assert.equal(
    catalogImportAllowed({
      GOOGLE_CLOUD_PROJECT: "piu-pizza-cl",
      PIU_CATALOG_IMPORT_PRODUCTION: "on",
      FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
    }),
    false
  )
  assert.equal(catalogImportAllowed({ GOOGLE_CLOUD_PROJECT: "piu-pizza-cl", PIU_CATALOG_IMPORT_PRODUCTION: "on" }), true)
  assert.equal(
    catalogImportAllowed({
      GOOGLE_CLOUD_PROJECT: "piu-pizza-cl",
      FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
    }),
    false
  )
  assert.equal(
    catalogImportAllowed({
      GOOGLE_CLOUD_PROJECT: "demo-piu-pizza",
      FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
    }),
    true
  )
  assert.equal(
    catalogImportAllowed({
      PIU_APP_ENV: "staging",
      PIU_EXPECTED_FIREBASE_PROJECT: "piu-pizza-staging",
      GOOGLE_CLOUD_PROJECT: "piu-pizza-staging",
    }),
    true
  )
  assert.doesNotMatch(readFileSync(new URL("../apphosting.yaml", import.meta.url), "utf8"), /PIU_FIREBASE_DATA/)
})

test("solo una foto de Storage reemplaza la ilustración", () => {
  assert.equal(isCatalogPhotoUrl("https://ejemplo.cl/foto.jpg"), false)
  assert.equal(
    isCatalogPhotoUrl("https://firebasestorage.googleapis.com/v0/b/piu-pizza-staging.firebasestorage.app/o/products%2Fabc%2Fhash.webp?alt=media&token=1"),
    true
  )
})

test("una foto grande queda en WebP de hasta 150 KB", async () => {
  const source = await sharp({
    create: { width: 2400, height: 1600, channels: 3, background: { r: 180, g: 40, b: 40 } },
  })
    .png()
    .toBuffer()
  const prepared = await prepareProductImage(source)
  assert.ok(prepared.bytes.byteLength <= 150 * 1024)
  const meta = await sharp(prepared.bytes).metadata()
  assert.equal(meta.format, "webp")
  assert.ok((meta.width ?? 0) <= 1200)
  assert.ok((meta.height ?? 0) <= 1200)
})
