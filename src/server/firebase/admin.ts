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
export function getAdminApp(): App {
  return getApps().length ? getApp() : initializeApp()
}
