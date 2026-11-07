import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth"

import { getFirebaseApp } from "@/lib/firebase/client"

let emulatorReady = false

/**
 * Auth del navegador para el ingreso del personal.
 * Solo lo usa el formulario de `/admin/login`. El sitio público no lo importa.
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
