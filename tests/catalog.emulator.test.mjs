import assert from "node:assert/strict"
import test from "node:test"

import { FieldPath } from "firebase-admin/firestore"

import { collections, publicCatalogDocId } from "@/lib/firebase/model"
import { importFudoCatalog } from "@/server/catalog/import"
import { readEvery } from "@/server/catalog/pages"
import { ensurePublicCatalog } from "@/server/catalog/publish"
import { deleteProduct, publishProductImage, saveCategory, saveProduct } from "@/server/catalog/service"
import { getDb } from "@/server/firebase/firestore"

const admin = { uid: "catalog-admin", role: "admin", email: "carta@example.com", displayName: "Carta" }

async function wipe() {
  const db = getDb()
  const [products, categories, published] = await Promise.all([
    db.collection(collections.products).get(),
    db.collection(collections.categories).get(),
    db.collection(collections.catalog).get(),
  ])
  const batch = db.batch()
  for (const doc of [...products.docs, ...categories.docs, ...published.docs]) batch.delete(doc.ref)
  await batch.commit()
}

test("importar dos veces deja 14 categorías y 131 productos", async () => {
  await wipe()
  const first = await importFudoCatalog()
  assert.deepEqual(first, { categories: 14, products: 131 })
  const db = getDb()
  const created = db.collection(collections.products).doc("piu-01-001-jugo-natural-fram")
  await created.set({ imageUrl: "https://firebasestorage.googleapis.com/v0/b/demo/o/products%2Fdemo%2Fa.webp?alt=media&token=1", isVisible: false }, { merge: true })
  const second = await importFudoCatalog()
  assert.deepEqual(second, { categories: 14, products: 131 })
  assert.equal((await db.collection(collections.products).get()).size, 131)
  assert.equal((await db.collection(collections.categories).get()).size, 14)
  await created.set({ name: "Jugo editado", description: "Texto del panel", priceClp: 999 }, { merge: true })
  await db.collection(collections.categories).doc("bebidas").set({ name: "Bebidas del local" }, { merge: true })
  const third = await importFudoCatalog()
  assert.deepEqual(third, { categories: 14, products: 131 })
  const kept = (await created.get()).data()
  assert.equal(kept?.name, "Jugo editado")
  assert.equal(kept?.description, "Texto del panel")
  assert.equal(kept?.priceClp, 999)
  assert.equal(kept?.imageUrl.includes("products%2Fdemo"), true)
  assert.equal(kept?.isVisible, false)
  assert.equal((await db.collection(collections.categories).doc("bebidas").get()).data()?.name, "Bebidas del local")
  await importFudoCatalog({ ...process.env, PIU_CATALOG_IMPORT_OVERWRITE: "on" })
  const restored = (await created.get()).data()
  assert.equal(restored?.name, "JugO Natural Fram")
  assert.equal(restored?.description, "Frambuesa, chirimoya, maracuyá")
  assert.equal(restored?.priceClp, 3500)
  assert.equal(restored?.isVisible, false)
  const unavailable = await db.collection(collections.products).where("availability", "==", "unavailable").get()
  assert.equal(unavailable.size, 7)
  const chef = await db.collection(collections.products).where("categoryId", "==", "sugerencias-del-chef").get()
  assert.equal(chef.size, 3)
})

test("el personal edita el precio y un visitante no", async () => {
  await assert.rejects(() => saveProduct(null, { name: "Extra" }), (error) => error.name === "StaffAccessError")
  const saved = await saveProduct(admin, {
    categoryId: "extras",
    name: "Producto de prueba",
    description: "",
    priceClp: 1000,
    availability: "available",
    isVisible: true,
    isFeatured: false,
    sortOrder: 99,
  })
  await saveProduct(admin, {
    id: saved.id,
    categoryId: "extras",
    name: "Producto de prueba",
    description: "",
    priceClp: 1500,
    availability: "unavailable",
    isVisible: false,
    isFeatured: false,
    sortOrder: 99,
  })
  const photo = "https://firebasestorage.googleapis.com/v0/b/demo/o/products%2Fdemo%2Fa.webp?alt=media&token=1"
  await getDb().collection(collections.products).doc(saved.id).set({ imageUrl: photo }, { merge: true })
  await saveProduct(admin, {
    id: saved.id,
    categoryId: "extras",
    name: "Producto de prueba",
    description: "",
    priceClp: 1800,
    availability: "unavailable",
    isVisible: false,
    isFeatured: false,
    sortOrder: 99,
  })
  const stored = await getDb().collection(collections.products).doc(saved.id).get()
  assert.equal(stored.data()?.priceClp, 1800)
  assert.equal(stored.data()?.isVisible, false)
  assert.equal(stored.data()?.imageUrl, photo)
  const published = await getDb().collection(collections.catalog).doc(publicCatalogDocId).get()
  assert.equal(published.data()?.products?.some((product) => product.id === saved.id), false)
  await deleteProduct(admin, saved.id)
  assert.equal((await getDb().collection(collections.products).doc(saved.id).get()).exists, false)
  assert.equal((await getDb().collection(collections.products).get()).size, 131)
  const afterDelete = await getDb().collection(collections.catalog).doc(publicCatalogDocId).get()
  assert.equal(afterDelete.data()?.products?.some((product) => product.id === saved.id), false)
})

test("la carta pública sigue al producto y no publica un guardado a medias", async () => {
  const db = getDb()
  const photo = "https://firebasestorage.googleapis.com/v0/b/demo/o/products%2Fdemo%2Fa.webp?alt=media&token=1"
  const saved = await saveProduct(admin, {
    categoryId: "extras",
    name: "Producto sincronizado",
    description: "Texto",
    priceClp: 2500,
    availability: "available",
    isVisible: true,
    isFeatured: false,
    sortOrder: 40,
  })
  await publishProductImage(admin, saved.id, photo)
  await saveProduct(admin, {
    id: saved.id,
    categoryId: "bebidas",
    name: "Producto sincronizado",
    description: "Texto",
    priceClp: 2600,
    availability: "unavailable",
    isVisible: true,
    isFeatured: false,
    sortOrder: 40,
  })
  const visible = (await db.collection(collections.catalog).doc(publicCatalogDocId).get()).data()
  const listed = visible.products.find((product) => product.id === saved.id)
  assert.equal(listed.priceClp, 2600)
  assert.equal(listed.availability, "unavailable")
  assert.equal(listed.categoryId, "bebidas")
  assert.equal(listed.imageUrl, photo)
  assert.equal(listed.isVisible, undefined)

  await saveProduct(admin, {
    id: saved.id,
    categoryId: "bebidas",
    name: "Producto sincronizado",
    description: "Texto",
    priceClp: 2600,
    availability: "unavailable",
    isVisible: false,
    isFeatured: false,
    sortOrder: 40,
  })
  const hidden = (await db.collection(collections.catalog).doc(publicCatalogDocId).get()).data()
  assert.equal(hidden.products.some((product) => product.id === saved.id), false)
  assert.equal((await db.collection(collections.products).doc(saved.id).get()).data()?.imageUrl, photo)

  const before = (await db.collection(collections.catalog).doc(publicCatalogDocId).get()).data()
  await assert.rejects(
    () =>
      saveProduct(admin, {
        categoryId: "no-existe",
        name: "No debe quedar",
        description: "",
        priceClp: 1,
        availability: "available",
        isVisible: true,
        isFeatured: false,
        sortOrder: 1,
      }),
    (error) => error.name === "CatalogError",
  )
  const after = (await db.collection(collections.catalog).doc(publicCatalogDocId).get()).data()
  assert.deepEqual(after, before)
  assert.equal((await db.collection(collections.products).where("name", "==", "No debe quedar").get()).size, 0)

  await db.collection(collections.catalog).doc(publicCatalogDocId).set({ categories: [], products: [], note: "no tocar" })
  await ensurePublicCatalog()
  assert.equal((await db.collection(collections.catalog).doc(publicCatalogDocId).get()).data()?.note, "no tocar")
  assert.equal((await db.collection(collections.products).doc(saved.id).get()).data()?.name, "Producto sincronizado")

  await Promise.all([
    saveProduct(admin, {
      id: saved.id,
      categoryId: "bebidas",
      name: "Desde el primero",
      description: "Texto",
      priceClp: 3100,
      availability: "available",
      isVisible: true,
      isFeatured: false,
      sortOrder: 40,
    }),
    saveProduct(admin, {
      categoryId: "extras",
      name: "Desde el segundo",
      description: "",
      priceClp: 3200,
      availability: "available",
      isVisible: true,
      isFeatured: false,
      sortOrder: 41,
    }),
  ])
  const raced = (await db.collection(collections.catalog).doc(publicCatalogDocId).get()).data()
  const first = raced.products.find((product) => product.id === saved.id)
  const second = raced.products.find((product) => product.name === "Desde el segundo")
  const stored = (await db.collection(collections.products).doc(saved.id).get()).data()
  assert.equal(first.priceClp, stored.priceClp)
  assert.equal(first.name, stored.name)
  assert.equal(first.imageUrl, photo)
  assert.ok(second)
  assert.equal(second.priceClp, 3200)

  await Promise.all([
    saveProduct(admin, {
      id: saved.id,
      categoryId: "bebidas",
      name: "Precio A",
      description: "Texto",
      priceClp: 4100,
      availability: "available",
      isVisible: true,
      isFeatured: false,
      sortOrder: 40,
    }),
    saveProduct(admin, {
      id: saved.id,
      categoryId: "bebidas",
      name: "Precio B",
      description: "Texto",
      priceClp: 4200,
      availability: "available",
      isVisible: true,
      isFeatured: false,
      sortOrder: 40,
    }),
  ])
  const agreed = (await db.collection(collections.products).doc(saved.id).get()).data()
  const agreedPublic = (await db.collection(collections.catalog).doc(publicCatalogDocId).get()).data().products.find((product) => product.id === saved.id)
  assert.equal(agreedPublic.priceClp, agreed.priceClp)
  assert.equal(agreedPublic.name, agreed.name)
  assert.equal(agreedPublic.imageUrl, photo)
  assert.ok(agreed.priceClp === 4100 || agreed.priceClp === 4200)

  await deleteProduct(admin, saved.id)
  await deleteProduct(admin, second.id)

  const extras = (await db.collection(collections.categories).doc("extras").get()).data()
  await saveCategory(admin, {
    id: "extras",
    name: extras.name,
    description: extras.description ?? null,
    sortOrder: extras.sortOrder,
    isVisible: false,
  })
  const categories = (await db.collection(collections.catalog).doc(publicCatalogDocId).get()).data().categories
  assert.equal(categories.some((category) => category.id === "extras"), false)
  await saveCategory(admin, {
    id: "extras",
    name: extras.name,
    description: extras.description ?? null,
    sortOrder: extras.sortOrder,
    isVisible: true,
  })
})

test("la carta lee más de una página de productos", async () => {
  const db = getDb()
  const batch = db.batch()
  const ids = Array.from({ length: 80 }, (_, index) => `pagina-extra-${index}`)
  for (const id of ids) {
    batch.set(db.collection(collections.products).doc(id), {
      categoryId: "extras",
      name: `Extra ${id}`,
      description: "",
      priceClp: 1000,
      imageUrl: null,
      availability: "available",
      isFeatured: false,
      isVisible: true,
      sortOrder: 500,
    })
  }
  await batch.commit()
  const visible = await readEvery(db.collection(collections.products).where("isVisible", "==", true).orderBy(FieldPath.documentId()))
  assert.ok(visible.length > 200)
  const cleanup = db.batch()
  for (const id of ids) cleanup.delete(db.collection(collections.products).doc(id))
  await cleanup.commit()
})
