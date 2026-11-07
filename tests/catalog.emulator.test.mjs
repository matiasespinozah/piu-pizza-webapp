import assert from "node:assert/strict"
import test from "node:test"

import { collections } from "@/lib/firebase/model"
import { importFudoCatalog } from "@/server/catalog/import"
import { deleteProduct, saveProduct } from "@/server/catalog/service"
import { getDb } from "@/server/firebase/firestore"

const admin = { uid: "catalog-admin", role: "admin", email: "carta@example.com", displayName: "Carta" }

async function wipe() {
  const db = getDb()
  const [products, categories] = await Promise.all([
    db.collection(collections.products).get(),
    db.collection(collections.categories).get(),
  ])
  const batch = db.batch()
  for (const doc of [...products.docs, ...categories.docs]) batch.delete(doc.ref)
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
  const stored = await getDb().collection(collections.products).doc(saved.id).get()
  assert.equal(stored.data()?.priceClp, 1500)
  assert.equal(stored.data()?.isVisible, false)
  await deleteProduct(admin, saved.id)
  assert.equal((await getDb().collection(collections.products).doc(saved.id).get()).exists, false)
  assert.equal((await getDb().collection(collections.products).get()).size, 131)
})
