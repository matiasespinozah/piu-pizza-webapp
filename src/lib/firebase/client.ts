import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app"

/**
 * Cliente web de Firebase (navegador). Ver .agents/rules/firebase-security.md.
 *
 * - Solo para Auth y lo estrictamente necesario en el cliente.
 * - Los datos públicos (menú, locales) se leen en el servidor vía `src/server/`.
 * - Esta configuración NO es secreta; viene de `apphosting.yaml` / `.env.local`.
 * - Importar los servicios bajo demanda (`firebase/auth`, …) solo en componentes cliente
 *   que los usen, para no inflar el JS de todas las páginas.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

export function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig)
}
