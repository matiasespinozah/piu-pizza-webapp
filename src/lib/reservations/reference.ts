/** Referencia visible, por ejemplo PIU-2021. No abre el seguimiento. */
const publicReferencePattern = /^PIU-\d{4}$/

function formatPublicReference(value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 9999) return null
  return `PIU-${String(value).padStart(4, "0")}`
}

/**
 * Elige un código que no esté en `taken`. Si el azar repite, prueba otro.
 * `null` significa que no quedó ninguno libre en los intentos pedidos.
 */
function claimPublicReference(taken: ReadonlySet<string>, draw: () => number, attempts = 8) {
  const seen = new Set<string>()
  const draws = Math.max(attempts, 1) * 4
  for (let count = 0; count < draws && seen.size < attempts; count += 1) {
    const code = formatPublicReference(draw())
    if (!code || seen.has(code)) continue
    seen.add(code)
    if (!taken.has(code)) return code
  }
  return null
}

export { claimPublicReference, formatPublicReference, publicReferencePattern }
