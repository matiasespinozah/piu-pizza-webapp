import "server-only"

import { createHash } from "node:crypto"

import sharp from "sharp"

const maxUploadBytes = 8 * 1024 * 1024
const maxOutputBytes = 150 * 1024

class CatalogImageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CatalogImageError"
  }
}

/** Deja la foto en WebP, a lo más 1200 px y 150 KB. No agranda una imagen chica. */
async function prepareProductImage(input: Buffer) {
  if (input.byteLength === 0 || input.byteLength > maxUploadBytes) {
    throw new CatalogImageError("La foto tiene que pesar menos de 8 MB.")
  }

  let quality = 75
  let output = Buffer.alloc(0)
  try {
    output = await render(input, quality)
    while (output.byteLength > maxOutputBytes && quality > 40) {
      quality -= 10
      output = await render(input, quality)
    }
  } catch {
    throw new CatalogImageError("Ese archivo no es una imagen que se pueda usar.")
  }

  if (output.byteLength > maxOutputBytes) {
    throw new CatalogImageError("La foto sigue pesando más de 150 KB después de prepararla.")
  }

  const hash = createHash("sha256").update(output).digest("hex").slice(0, 16)
  return { bytes: output, hash }
}

function render(input: Buffer, quality: number) {
  return sharp(input, { failOn: "error" })
    .rotate()
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality })
    .toBuffer()
}

export { CatalogImageError, prepareProductImage }
