/**
 * Dirección que usa el tope de solicitudes.
 * En Cloud Run / App Hosting la plataforma agrega al final la IP que vio.
 * La primera puede haberla escrito el cliente, así que no se usa.
 * No se guarda la dirección: solo entra al hash del contador.
 */
function clientAddress(forwardedFor: string | null) {
  const parts = (forwardedFor ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && part.length <= 64)
  return parts.at(-1) || "unknown"
}

export { clientAddress }
