import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth"

import { getFirebaseApp } from "@/lib/firebase/client"

let emulatorReady = false

/**
 * Auth del navegador, solo para el futuro ingreso del personal.
 * Ninguna página lo importa en este hito, así que no entra al bundle público.
 * El emulador se usa únicamente si la variable está definida. App Hosting no la define.
 */
function getClientAuth(): Auth {
  const auth = getAuth(getFirebaseApp())
  const host = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST
  if (host && !emulatorReady) {
    connectAuthEmulator(auth, host.startsWith("http") ? host : `http://${host}`, { disableWarnings: true })
    emulatorReady = true
  }
  return auth
}

export { getClientAuth }
