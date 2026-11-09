import { firebaseDataAccessEnabled } from "@/lib/firebase/access"

/** La consola de App Hosting puede guardar el valor con espacios o en mayúsculas. */
function flagOn(value: string | undefined) {
  return value?.trim().toLowerCase() === "on"
}

/**
 * Escrituras de reservas. Apagadas salvo que se pidan a propósito y, además,
 * el proceso ya esté en el emulador o con el acceso a datos aprobado.
 * No se activa al desplegar código.
 */
function reservationWritesEnabled(env: Record<string, string | undefined> = process.env) {
  if (!flagOn(env.PIU_RESERVATIONS_WRITES)) return false
  if (env.GCLOUD_PROJECT === "piu-pizza-cl" && env.FIRESTORE_EMULATOR_HOST) return false
  return Boolean(env.FIRESTORE_EMULATOR_HOST) || firebaseDataAccessEnabled(env)
}

/**
 * Lectura pública del seguimiento. No enciende las escrituras.
 * Hace falta el interruptor propio y, además, el emulador o el acceso a datos ya aprobado.
 */
function reservationStatusEnabled(env: Record<string, string | undefined> = process.env) {
  if (!flagOn(env.PIU_RESERVATION_STATUS)) return false
  if (env.GCLOUD_PROJECT === "piu-pizza-cl" && env.FIRESTORE_EMULATOR_HOST) return false
  return Boolean(env.FIRESTORE_EMULATOR_HOST) || firebaseDataAccessEnabled(env)
}

export { reservationStatusEnabled, reservationWritesEnabled }
