/**
 * Asigna el custom claim `role: superadmin` a una cuenta que ya existe.
 * No crea usuarios ni contraseñas.
 *
 * No toca producción salvo que se pidan, juntas, estas tres variables:
 *   PIU_BOOTSTRAP_CONFIRM=assign-superadmin
 *   PIU_BOOTSTRAP_TARGET=production
 *   BOOTSTRAP_UID=<uid de Authentication>
 * y que GOOGLE_APPLICATION_CREDENTIALS apunte a una clave FUERA del repositorio.
 *
 * Para ensayar sin producción, levantar el emulador de Auth y definir
 * FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 (sin PIU_BOOTSTRAP_TARGET).
 */
import { initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"

const uid = process.env.BOOTSTRAP_UID?.trim() ?? ""
const confirmed = process.env.PIU_BOOTSTRAP_CONFIRM === "assign-superadmin"
const production = process.env.PIU_BOOTSTRAP_TARGET === "production"
const emulator = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST)
const uidOk = /^[A-Za-z0-9]{10,128}$/.test(uid)

if (!confirmed || !uidOk || (!emulator && !production)) {
  console.error("No se asignó ningún rol.")
  console.error("Hace falta PIU_BOOTSTRAP_CONFIRM=assign-superadmin y BOOTSTRAP_UID con el uid real.")
  console.error("Para un ensayo: FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099.")
  console.error("Para producción, además: PIU_BOOTSTRAP_TARGET=production y una credencial fuera del repo.")
  console.error("Pasos de consola: docs/arquitectura/firebase.md")
  process.exit(1)
}

if (production && emulator) {
  console.error("Quita el emulador o quita PIU_BOOTSTRAP_TARGET. No se mezclan los dos destinos.")
  process.exit(1)
}

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "piu-pizza-cl"
const app = emulator ? initializeApp({ projectId }) : initializeApp()
const auth = getAuth(app)

const existing = await auth.getUser(uid)
const current = existing.customClaims?.role
if (current === "superadmin") {
  console.error("Esa cuenta ya es SUPERADMIN. No se volvió a asignar.")
  process.exit(1)
}

await auth.setCustomUserClaims(uid, { role: "superadmin" })
await auth.revokeRefreshTokens(uid)
console.log(`SUPERADMIN asignado a ${uid}. Las sesiones anteriores quedaron revocadas.`)
