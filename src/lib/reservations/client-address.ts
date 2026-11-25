import { BlockList, isIP } from "node:net"

/**
 * Rangos publicados por Cloudflare (https://www.cloudflare.com/ips/).
 * Solo se confía en `CF-Connecting-IP` cuando la conexión viene de uno de ellos:
 * quien llame al origen directo no puede hacerse pasar por otro visitante.
 * Si Cloudflare agrega rangos nuevos, el efecto es volver al comportamiento anterior.
 */
const cloudflareRanges: { network: string; prefix: number; family: "ipv4" | "ipv6" }[] = [
  { network: "173.245.48.0", prefix: 20, family: "ipv4" },
  { network: "103.21.244.0", prefix: 22, family: "ipv4" },
  { network: "103.22.200.0", prefix: 22, family: "ipv4" },
  { network: "103.31.4.0", prefix: 22, family: "ipv4" },
  { network: "141.101.64.0", prefix: 18, family: "ipv4" },
  { network: "108.162.192.0", prefix: 18, family: "ipv4" },
  { network: "190.93.240.0", prefix: 20, family: "ipv4" },
  { network: "188.114.96.0", prefix: 20, family: "ipv4" },
  { network: "197.234.240.0", prefix: 22, family: "ipv4" },
  { network: "198.41.128.0", prefix: 17, family: "ipv4" },
  { network: "162.158.0.0", prefix: 15, family: "ipv4" },
  { network: "104.16.0.0", prefix: 13, family: "ipv4" },
  { network: "104.24.0.0", prefix: 14, family: "ipv4" },
  { network: "172.64.0.0", prefix: 13, family: "ipv4" },
  { network: "131.0.72.0", prefix: 22, family: "ipv4" },
  { network: "2400:cb00::", prefix: 32, family: "ipv6" },
  { network: "2606:4700::", prefix: 32, family: "ipv6" },
  { network: "2803:f800::", prefix: 32, family: "ipv6" },
  { network: "2405:b500::", prefix: 32, family: "ipv6" },
  { network: "2405:8100::", prefix: 32, family: "ipv6" },
  { network: "2a06:98c0::", prefix: 29, family: "ipv6" },
  { network: "2c0f:f248::", prefix: 32, family: "ipv6" },
]

const cloudflare = new BlockList()
for (const range of cloudflareRanges) cloudflare.addSubnet(range.network, range.prefix, range.family)

function fromCloudflare(address: string) {
  const family = isIP(address)
  if (family === 0) return false
  return cloudflare.check(address, family === 4 ? "ipv4" : "ipv6")
}

/**
 * Dirección que usa el tope de solicitudes.
 * En Cloud Run / App Hosting la plataforma agrega al final la IP que vio.
 * La primera puede haberla escrito el cliente, así que no se usa.
 * Detrás de Cloudflare esa última IP es la del borde de Cloudflare, compartida por
 * muchos visitantes: si la conexión viene de Cloudflare se usa `CF-Connecting-IP`.
 * No se guarda la dirección: solo entra al hash del contador.
 */
function clientAddress(forwardedFor: string | null, cfConnectingIp?: string | null) {
  const parts = (forwardedFor ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && part.length <= 64)
  const last = parts.at(-1)

  const visitor = cfConnectingIp?.trim() ?? ""
  if (last && visitor && isIP(visitor) !== 0 && fromCloudflare(last)) return visitor

  return last || "unknown"
}

export { clientAddress }
