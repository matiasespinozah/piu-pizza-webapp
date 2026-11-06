/**
 * El proceso solo habla con Firestore si alguien lo pidió a propósito
 * o si está apuntando al emulador. Así `pnpm dev` y el build no leen producción.
 */
function firebaseDataAccessEnabled(env: Record<string, string | undefined> = process.env) {
  return env.PIU_FIREBASE_DATA === "on" || Boolean(env.FIRESTORE_EMULATOR_HOST)
}

export { firebaseDataAccessEnabled }
