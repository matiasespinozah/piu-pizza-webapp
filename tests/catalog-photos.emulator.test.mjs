import assert from "node:assert/strict"
import test from "node:test"

import { getStorage } from "firebase-admin/storage"
import sharp from "sharp"

import { collections, publicCatalogDocId } from "@/lib/firebase/model"
import { importFudoCatalog } from "@/server/catalog/import"
import { addProductPhotoVariants, replaceProductPhoto } from "@/server/catalog/service"
import { getAdminApp } from "@/server/firebase/admin"
import { getDb } from "@/server/firebase/firestore"

const admin = { uid: "photo-admin", role: "admin", email: "fotos@example.com", displayName: "Fotos" }
const id = "piu-01-001-jugo-natural-fram"
const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET

function bucket() {
  return getStorage(getAdminApp()).bucket(bucketName)
}

async function names() {
  const [files] = await bucket().getFiles({ prefix: `products/${id}/` })
  return files.map((file) => file.name).sort()
}

/** Imagen suave, parecida a una foto, para no depender de archivos del repo. */
function photo(color) {
  return sharp({ create: { width: 2400, height: 1600, channels: 3, noise: { type: "gaussian", mean: color, sigma: 25 } } })
    .blur(5)
    .jpeg({ quality: 80 })
    .toBuffer()
}

async function stored() {
  return (await getDb().collection(collections.products).doc(id).get()).data()
}

async function published() {
  return (await getDb().collection(collections.catalog).doc(publicCatalogDocId).get()).data()?.products?.find((item) => item.id === id)
}

async function width(path) {
  const [bytes] = await bucket().file(path).download()
  return (await sharp(bytes).metadata()).width
}

test("subir una foto guarda tres archivos y publica las versiones en la carta", async () => {
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= "127.0.0.1:9199"
  await importFudoCatalog()
  const { imageUrl } = await replaceProductPhoto(admin, id, await photo(120))

  const files = await names()
  assert.equal(files.length, 3)
  const main = files.find((name) => !/-(360|900)\.webp$/.test(name))
  assert.ok(main)
  assert.deepEqual(files, [main, main.replace(/\.webp$/, "-360.webp"), main.replace(/\.webp$/, "-900.webp")].sort())
  assert.equal(await width(main), 1600)
  assert.equal(await width(main.replace(/\.webp$/, "-900.webp")), 900)
  assert.equal(await width(main.replace(/\.webp$/, "-360.webp")), 360)

  const doc = await stored()
  assert.equal(doc.imageUrl, imageUrl)
  assert.ok(doc.imageVariants.thumb.includes(encodeURIComponent(main.replace(/\.webp$/, "-360.webp"))))
  assert.ok(doc.imageVariants.medium.includes(encodeURIComponent(main.replace(/\.webp$/, "-900.webp"))))
  assert.deepEqual((await published()).imageVariants, doc.imageVariants)
})

test("cambiar la foto borra los tres archivos anteriores y deja solo los tres nuevos", async () => {
  const before = await names()
  await replaceProductPhoto(admin, id, await photo(200))
  const after = await names()
  assert.equal(after.length, 3)
  assert.equal(after.some((name) => before.includes(name)), false)
  const doc = await stored()
  assert.ok(doc.imageUrl.includes(encodeURIComponent(after.find((name) => !/-(360|900)\.webp$/.test(name)))))
  assert.deepEqual((await published()).imageVariants, doc.imageVariants)
})

test("agregar las versiones a una foto que no las tiene no cambia la foto ni su dirección", async () => {
  const [main] = (await names()).filter((name) => !/-(360|900)\.webp$/.test(name))
  // Estado de producción hoy: foto principal sin versiones.
  await Promise.all([bucket().file(main.replace(/\.webp$/, "-360.webp")).delete(), bucket().file(main.replace(/\.webp$/, "-900.webp")).delete()])
  await getDb().collection(collections.products).doc(id).update({ imageVariants: null })
  const before = await stored()
  assert.equal(before.imageVariants, null)

  assert.equal(await addProductPhotoVariants(admin, id), "done")
  const doc = await stored()
  assert.equal(doc.imageUrl, before.imageUrl)
  assert.equal((await names()).length, 3)
  assert.equal(await width(main.replace(/\.webp$/, "-360.webp")), 360)
  assert.equal(await width(main.replace(/\.webp$/, "-900.webp")), 900)
  assert.deepEqual((await published()).imageVariants, doc.imageVariants)
  assert.equal((await published()).imageUrl, before.imageUrl)

  // Repetirlo no hace nada.
  assert.equal(await addProductPhotoVariants(admin, id), "already")
})

test("sin foto o sin producto no se toca nada, y solo el personal puede hacerlo", async () => {
  assert.equal(await addProductPhotoVariants(admin, "piu-01-002-no-existe"), "missing")
  const other = (await getDb().collection(collections.products).limit(5).get()).docs.find((doc) => doc.id !== id && !doc.get("imageUrl"))
  assert.ok(other)
  assert.equal(await addProductPhotoVariants(admin, other.id), "no-photo")
  await assert.rejects(() => addProductPhotoVariants(null, id), (error) => error.name === "StaffAccessError")
})
