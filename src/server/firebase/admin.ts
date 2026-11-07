import "server-only"

import { getApp, getApps, initializeApp, type App } from "firebase-admin/app"

/**
 * Firebase Admin SDK (solo servidor). Ver .agents/rules/firebase-security.md.
 *
 * - En App Hosting usa las credenciales del service account del backend (ADC):
 *   no hay claves ni JSON de service account en el repo.
 * - El Admin SDK IGNORA las Security Rules: toda función que lo use debe validar
 *   input (zod) y verificar sesión y rol antes de leer o escribir.
 * - Importar los servicios bajo demanda: `getFirestore(getAdminApp())`, `getAuth(…)`.
 */
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "piu-pizza-cl"

export function getAdminApp(): App {
  if (getApps().length > 0) return getApp()

  // En el emulador no hay credencial de Google. En App Hosting, initializeApp()
  // usa la cuenta de servicio del backend (ADC). No hay JSON de claves en el repo.
  const emulator = process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST
  if (emulator) return initializeApp({ projectId })

  return initializeApp()
}
