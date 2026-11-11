import { timingSafeEqual } from "node:crypto"

/** El secreto lo pone Cloud Scheduler. Si falta o no coincide, el barrido no corre. */
function authorizeNoticeCron(authorization: string | null, secret: string | undefined) {
  if (!secret || secret.length < 16) return false
  const match = /^Bearer\s+(\S+)$/.exec(authorization ?? "")
  if (!match) return false
  const token = Buffer.from(match[1])
  const expected = Buffer.from(secret)
  if (token.length !== expected.length) return false
  return timingSafeEqual(token, expected)
}

export { authorizeNoticeCron }
