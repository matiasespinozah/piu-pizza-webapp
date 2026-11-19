import { createHmac } from "node:crypto"

const guestSecretMinLength = 32

function guestDocumentId(email: string, secret: string) {
  return createHmac("sha256", secret).update(email).digest("hex")
}

export { guestDocumentId, guestSecretMinLength }
