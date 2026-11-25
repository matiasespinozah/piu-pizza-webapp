import { readFileSync } from "node:fs"
import test from "node:test"
import assert from "node:assert/strict"

import { catalogImportAllowed, planCatalogImport } from "@/lib/catalog/import-plan"
import { catalogCacheLife } from "@/lib/catalog/public-cache"
import { dropIndex, moveCategoryId, movesForCategoryOrder } from "@/lib/catalog/category-order"
import { newCategoryId } from "@/lib/catalog/slug"
import { isCatalogPhotoUrl, photosToDelete, readImageVariants } from "@/lib/catalog/photos"
import {
  assertPublicCatalogFits,
  firestoreDocumentLimit,
  projectPublicCatalog,
  publicCatalogSchema,
  publicSuggestions,
  PublicCatalogTooLargeError,
} from "@/lib/catalog/public-snapshot"
import { productSchema } from "@/lib/firebase/model"
import { prepareProductImage, prepareProductVariants } from "@/server/catalog/images"
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

test("la carta publicada cabe en un documento y no muestra ocultos", () => {
  const plan = planCatalogImport(catalog)
  const photo = "https://firebasestorage.googleapis.com/v0/b/piu-pizza-cl.firebasestorage.app/o/products%2Fdemo%2Fa.webp?alt=media&token=11111111-1111-1111-1111-111111111111"
  const withPhotos = plan.products.map((product) => ({ ...product, imageUrl: photo }))
  const plain = withPhotos.find((product) => !product.isFeatured)
  const chef = withPhotos.find((product) => product.isFeatured)
  const hidden = { ...plain, isVisible: false }
  const soldOut = { ...chef, availability: "unavailable", isVisible: true }
  const published = projectPublicCatalog(
    plan.categories,
    withPhotos.map((product) => (product.id === hidden.id ? hidden : product.id === soldOut.id ? soldOut : product)),
  )
  assert.equal(published.products.some((product) => product.id === hidden.id), false)
  assert.equal(published.products.find((product) => product.id === soldOut.id)?.availability, "unavailable")
  assert.equal(published.products.find((product) => product.id === soldOut.id)?.imageUrl, photo)
  assert.equal("isVisible" in published.products[0], false)
  const bytes = assertPublicCatalogFits(published)
  assert.ok(bytes < firestoreDocumentLimit)
  assert.ok(bytes < 900_000)
  const heavy = projectPublicCatalog(
    plan.categories,
    Array.from({ length: 2000 }, (_, index) => ({
      ...withPhotos[0],
      id: `producto-${index}`,
      name: `Producto ${index}`,
      description: "x".repeat(500),
    })),
  )
  assert.throws(() => assertPublicCatalogFits(heavy), PublicCatalogTooLargeError)
  const suggestions = publicSuggestions(published.products, "sugerencias-del-chef")
  assert.equal(suggestions.length, 3)
  assert.equal(suggestions.every((product) => product.categoryId === "sugerencias-del-chef" || product.isFeatured), true)
})

test("guardar la carta no depende de una sola instancia ni de una sola página", () => {
  assert.equal(catalogCacheLife.stale, 300)
  assert.equal(catalogCacheLife.revalidate, 300)
  assert.equal(catalogCacheLife.expire, 86_400)
  assert.ok(catalogCacheLife.expire >= 300)
  assert.ok(catalogCacheLife.expire - catalogCacheLife.revalidate >= 86_000)
  const names = [
    "products/pizza/vigente.webp",
    "products/pizza/vieja.webp",
    "products/otra/vigente.webp",
    "otras/pizza/vigente.webp",
  ]
  assert.deepEqual(photosToDelete(names, "pizza", "products/pizza/vigente.webp"), ["products/pizza/vieja.webp"])
  assert.deepEqual(photosToDelete(names, "pizza", "products/otra/vigente.webp"), [])
  assert.deepEqual(photosToDelete(names, "pizza"), ["products/pizza/vigente.webp", "products/pizza/vieja.webp"])
})

test("solo una foto de Storage reemplaza la ilustración", () => {
  assert.equal(isCatalogPhotoUrl("https://ejemplo.cl/foto.jpg"), false)
  assert.equal(
    isCatalogPhotoUrl("https://firebasestorage.googleapis.com/v0/b/piu-pizza-staging.firebasestorage.app/o/products%2Fabc%2Fhash.webp?alt=media&token=1"),
    true
  )
})

test("una foto grande queda en WebP nítido de hasta 1600 px", async () => {
  const source = await sharp({
    create: { width: 2400, height: 1600, channels: 3, background: { r: 180, g: 40, b: 40 } },
  })
    .png()
    .toBuffer()
  const prepared = await prepareProductImage(source)
  assert.ok(prepared.bytes.byteLength <= 400 * 1024)
  const meta = await sharp(prepared.bytes).metadata()
  assert.equal(meta.format, "webp")
  assert.equal(meta.width, 1600)
  assert.ok((meta.height ?? 0) <= 1600)
})

test("una categoría nueva no pisa el identificador de una que ya existe", () => {
  const existing = ["bebidas", "pizzas-clasicas"]
  assert.equal(newCategoryId("Bebidas", existing).ok, false)
  assert.equal(newCategoryId("Pizzas clasicas", existing).ok, false)
  assert.equal(newCategoryId("Pizzas clásicas", existing).ok, false)
  const created = newCategoryId("Jugos naturales", existing)
  assert.equal(created.ok, true)
  if (created.ok) assert.equal(created.id, "jugos-naturales")
  assert.equal(newCategoryId("...", existing).ok, false)
})

test("arrastrar una categoría reubica el orden sin repetir números", () => {
  const rows = [
    { id: "chef", top: 0, height: 50 },
    { id: "palitos", top: 58, height: 50 },
    { id: "bebidas", top: 116, height: 50 },
  ]
  const ids = ["chef", "palitos", "bebidas"]
  const belowPalitos = dropIndex(90, rows, "chef")
  assert.deepEqual(moveCategoryId(ids, "chef", belowPalitos), ["palitos", "chef", "bebidas"])
  const aboveChef = dropIndex(10, rows, "bebidas")
  assert.deepEqual(moveCategoryId(ids, "bebidas", aboveChef), ["bebidas", "chef", "palitos"])
  const current = [
    { id: "chef", sortOrder: 1 },
    { id: "palitos", sortOrder: 7 },
    { id: "bebidas", sortOrder: 11 },
  ]
  assert.deepEqual(movesForCategoryOrder(current, ["bebidas", "chef", "palitos"]), [
    { id: "bebidas", sortOrder: 1 },
    { id: "chef", sortOrder: 7 },
    { id: "palitos", sortOrder: 11 },
  ])
  assert.deepEqual(
    movesForCategoryOrder(
      [
        { id: "chef", sortOrder: 1 },
        { id: "palitos", sortOrder: 1 },
      ],
      ["palitos", "chef"],
    ),
    [{ id: "chef", sortOrder: 2 }],
  )
  assert.equal(movesForCategoryOrder(current, ["chef", "palitos", "bebidas"])?.length, 0)
  assert.equal(movesForCategoryOrder(current, ["chef", "otra"]), null)
})

const storageUrl = (name) =>
  `https://firebasestorage.googleapis.com/v0/b/demo/o/${encodeURIComponent(`products/p1/${name}`)}?alt=media&token=1`

test("las versiones chicas de la foto se leen solo si ambas son de Storage", () => {
  const good = { thumb: storageUrl("h-360.webp"), medium: storageUrl("h-900.webp") }
  assert.deepEqual(readImageVariants(good), good)
  assert.equal(readImageVariants(undefined), null)
  assert.equal(readImageVariants(null), null)
  assert.equal(readImageVariants("texto"), null)
  assert.equal(readImageVariants({ thumb: good.thumb }), null)
  assert.equal(readImageVariants({ thumb: good.thumb, medium: "https://ejemplo.cl/x.webp" }), null)
  assert.equal(readImageVariants({ thumb: 1, medium: 2 }), null)
})

test("un dato malo de las versiones no impide leer el producto ni la carta publicada", () => {
  const base = {
    categoryId: "c",
    name: "Pizza",
    description: "",
    priceClp: 1000,
    imageUrl: storageUrl("h.webp"),
    availability: "available",
    isFeatured: false,
    isVisible: true,
    sortOrder: 1,
  }
  // Documento anterior a las versiones: sin el campo.
  const old = productSchema.safeParse(base)
  assert.equal(old.success, true)
  assert.equal(old.data.imageVariants, null)
  // Valor corrupto: se ignora, el producto se sigue publicando con su foto principal.
  assert.equal(productSchema.safeParse({ ...base, imageVariants: "roto" }).data.imageVariants, null)
  assert.equal(productSchema.safeParse({ ...base, imageVariants: { thumb: "x" } }).success, true)
  const ok = { thumb: storageUrl("h-360.webp"), medium: storageUrl("h-900.webp") }
  assert.deepEqual(productSchema.safeParse({ ...base, imageVariants: ok }).data.imageVariants, ok)

  // La carta publicada antes de este cambio no trae el campo y sigue siendo válida.
  const snapshot = { categories: [], products: [{ id: "p1", ...Object.fromEntries(Object.entries(base).filter(([k]) => k !== "isVisible")) }] }
  const parsedOld = publicCatalogSchema.safeParse(snapshot)
  assert.equal(parsedOld.success, true)
  assert.equal(parsedOld.data.products[0].imageVariants, undefined)
  snapshot.products[0].imageVariants = ok
  assert.deepEqual(publicCatalogSchema.safeParse(snapshot).data.products[0].imageVariants, ok)
  snapshot.products[0].imageVariants = { thumb: "https://ejemplo.cl/a.webp", medium: "b" }
  const bad = publicCatalogSchema.safeParse(snapshot)
  assert.equal(bad.success, true)
  assert.equal(bad.data.products[0].imageVariants, undefined)
})

test("la carta pública lleva las versiones solo de los productos que las tienen", () => {
  const ok = { thumb: storageUrl("h-360.webp"), medium: storageUrl("h-900.webp") }
  const category = { id: "c", slug: "c", name: "C", description: null, sortOrder: 1, isVisible: true }
  const product = (id, extra = {}) => ({
    id,
    categoryId: "c",
    name: id,
    description: "",
    priceClp: 1000,
    imageUrl: storageUrl(`${id}.webp`),
    availability: "available",
    isFeatured: false,
    isVisible: true,
    sortOrder: 1,
    ...extra,
  })
  const projected = projectPublicCatalog([category], [product("a", { imageVariants: ok }), product("b"), product("c2", { imageVariants: null })])
  const byId = Object.fromEntries(projected.products.map((item) => [item.id, item]))
  assert.deepEqual(byId.a.imageVariants, ok)
  assert.equal("imageVariants" in byId.b, false)
  assert.equal("imageVariants" in byId.c2, false)
})

test("al cambiar de foto se conservan los archivos en uso, que ahora son tres", () => {
  const names = ["products/p1/a.webp", "products/p1/a-900.webp", "products/p1/a-360.webp", "products/p1/old.webp", "products/p1/old-900.webp", "products/p2/z.webp"]
  const keep = ["products/p1/a.webp", "products/p1/a-900.webp", "products/p1/a-360.webp"]
  assert.deepEqual(photosToDelete(names, "p1", keep), ["products/p1/old.webp", "products/p1/old-900.webp"])
  assert.equal(photosToDelete(names, "p1", "products/p1/a.webp").length, 4)
  // Si algo a conservar no es de ese producto, no se borra nada.
  assert.deepEqual(photosToDelete(names, "p1", ["products/p1/a.webp", "products/p2/z.webp"]), [])
  assert.deepEqual(photosToDelete(names, "../x", keep), [])
})

test("las versiones chicas miden por el lado corto: sirven a fotos verticales y horizontales", async () => {
  const photo = (width, height) =>
    sharp({ create: { width, height, channels: 3, noise: { type: "gaussian", mean: 128, sigma: 30 } } })
      .blur(6)
      .jpeg({ quality: 80 })
      .toBuffer()
  const sizes = async (bytes) => {
    const meta = await sharp(bytes).metadata()
    return [meta.width, meta.height]
  }

  // Horizontal (3:2): el lado corto es el alto. La fila de la carta recorta a cuadrado y necesita 360 px de alto.
  const landscape = await prepareProductImage(await photo(3000, 2000))
  const wide = await prepareProductVariants(landscape.bytes)
  assert.equal((await sizes(wide.thumb))[1], 360)
  assert.equal((await sizes(wide.medium))[1], 900)
  assert.equal((await sizes(wide.thumb))[0] >= 360, true)

  // Vertical (3:4), como las fotos de la carta: el lado corto es el ancho.
  const portrait = await prepareProductImage(await photo(2400, 3200))
  const tall = await prepareProductVariants(portrait.bytes)
  assert.deepEqual(await sizes(tall.thumb), [360, 480])
  assert.deepEqual(await sizes(tall.medium), [900, 1200])
  assert.equal((await sharp(tall.thumb).metadata()).format, "webp")

  // Orden de tamaños: miniatura < mediana < principal.
  assert.ok(tall.thumb.byteLength < tall.medium.byteLength)
  assert.ok(tall.medium.byteLength < portrait.bytes.byteLength)

  // Una foto que ya es chica no se agranda.
  const tiny = await prepareProductImage(await photo(300, 200))
  const small = await prepareProductVariants(tiny.bytes)
  assert.deepEqual(await sizes(small.medium), [300, 200])
  assert.deepEqual(await sizes(small.thumb), [300, 200])
})
