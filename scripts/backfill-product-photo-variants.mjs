/**
 * Genera las versiones chicas (360 y 900 px) de las fotos de producto que todavía no las tienen.
 * No cambia la foto principal ni su dirección. Es seguro repetirlo: lo ya migrado se salta.
 *
 *   node --import ./tests/register-alias.mjs scripts/backfill-product-photo-variants.mjs [--apply] [--limit N] [--only ID]
 *
 * Sin `--apply` solo lista qué haría (no escribe nada). Con `--apply` contra producción exige
 * `PIU_BACKFILL_PRODUCTION=on`, igual que la importación del catálogo. Usa las credenciales por defecto
 * de Google (ADC) o el emulador. Ver docs/arquitectura/catalogo.md.
 */
import { FieldPath } from "firebase-admin/firestore"

const args = process.argv.slice(2)
const apply = args.includes("--apply")
const flag = (name) => {
  const at = args.indexOf(name)
  return at === -1 ? null : (args[at + 1] ?? null)
}
const limit = flag("--limit") === null ? Infinity : Number(flag("--limit"))
const only = flag("--only")
if (!(limit > 0)) {
  console.error("--limit tiene que ser un número mayor que 0.")
  process.exit(2)
}

const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "piu-pizza-cl"
const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST)
const production = !emulator && project === "piu-pizza-cl"
const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "(sin definir)"

console.log(`Proyecto: ${project}${emulator ? " (emulador)" : ""} · bucket: ${bucket} · modo: ${apply ? "ESCRIBIR" : "simulación"}`)
if (apply && production && process.env.PIU_BACKFILL_PRODUCTION !== "on") {
  console.error("Para escribir en producción define PIU_BACKFILL_PRODUCTION=on. No se hizo ningún cambio.")
  process.exit(2)
}
if (!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
  console.error("Falta NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.")
  process.exit(2)
}
process.env.PIU_FIREBASE_DATA ||= "on"

const { isCatalogPhotoUrl, readImageVariants } = await import("@/lib/catalog/photos")
const { collections } = await import("@/lib/firebase/model")
const { getDb } = await import("@/server/firebase/firestore")
const { addProductPhotoVariants } = await import("@/server/catalog/service")

const snap = await getDb().collection(collections.products).orderBy(FieldPath.documentId()).limit(1000).get()
const withPhoto = snap.docs.filter((doc) => typeof doc.get("imageUrl") === "string" && isCatalogPhotoUrl(doc.get("imageUrl")))
const pending = withPhoto.filter((doc) => !readImageVariants(doc.get("imageVariants")))
const targets = pending.filter((doc) => !only || doc.id === only).slice(0, limit)

console.log(`Productos: ${snap.size} · con foto: ${withPhoto.length} · con versiones: ${withPhoto.length - pending.length} · pendientes: ${pending.length}`)
console.log(`A procesar ahora: ${targets.length}`)
for (const doc of targets) console.log(`  - ${doc.id}  ${String(doc.get("name") ?? "").slice(0, 40)}`)

if (!apply) {
  console.log("\nSimulación: no se escribió nada. Agrega --apply para generar las versiones.")
  process.exit(0)
}

const session = { uid: "backfill-photo-variants", role: "superadmin", email: "migracion@piupizzas.cl", displayName: "Migración de fotos" }
const counts = {}
for (const doc of targets) {
  try {
    const result = await addProductPhotoVariants(session, doc.id)
    counts[result] = (counts[result] ?? 0) + 1
    console.log(`  ${result.padEnd(8)} ${doc.id}`)
  } catch (error) {
    counts.error = (counts.error ?? 0) + 1
    console.error(`  error    ${doc.id}: ${error instanceof Error ? error.message : error}`)
  }
}
console.log("\nResumen:", JSON.stringify(counts))
process.exit(counts.error || counts.failed ? 1 : 0)
