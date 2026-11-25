import "server-only"

import { createHash } from "node:crypto"

import sharp from "sharp"

const maxUploadBytes = 8 * 1024 * 1024
/** Una foto de celular de 48 MP son 48 millones. Más que eso es una imagen que se descomprime a cientos de MB. */
const maxInputPixels = 64_000_000
const maxOutputBytes = 400 * 1024
const edges = [1600, 1400, 1200]
const qualities = [80, 76, 72]

class CatalogImageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CatalogImageError"
  }
}

/** Deja la foto en WebP, a lo más 1600 px y 400 KB, sin bajar de calidad 72. No agranda una imagen chica. */
async function prepareProductImage(input: Buffer) {
  if (input.byteLength === 0 || input.byteLength > maxUploadBytes) {
    throw new CatalogImageError("La foto tiene que pesar menos de 8 MB.")
  }

  let output = Buffer.alloc(0)
  try {
    for (const edge of edges) {
      for (const quality of qualities) {
        output = await render(input, edge, quality)
        if (output.byteLength <= maxOutputBytes) break
      }
      if (output.byteLength <= maxOutputBytes) break
    }
  } catch {
    throw new CatalogImageError("Ese archivo no es una imagen que se pueda usar.")
  }

  if (output.byteLength > maxOutputBytes) {
    throw new CatalogImageError("La foto sigue pesando más de 400 KB después de prepararla.")
  }

  const hash = createHash("sha256").update(output).digest("hex").slice(0, 16)
  return { bytes: output, hash }
}

/** Anchos de las versiones chicas. `thumb` cubre una miniatura de 96 px en pantalla 3×. */
const variantWidths = { thumb: 360, medium: 900 } as const

/**
 * Versiones chicas de la foto ya preparada, para listas y tarjetas. En producción no hay optimizador
 * de imágenes, así que sin esto una miniatura de 96 px descarga la foto de hasta 400 KB.
 */
async function prepareProductVariants(prepared: Buffer) {
  const make = (width: number, quality: number) =>
    sharp(prepared, { failOn: "error", limitInputPixels: maxInputPixels })
      .resize({ width, withoutEnlargement: true })
      .webp({ quality, effort: 5 })
      .toBuffer()
  const [thumb, medium] = await Promise.all([make(variantWidths.thumb, 76), make(variantWidths.medium, 78)])
  return { thumb, medium }
}

function render(input: Buffer, edge: number, quality: number) {
  return sharp(input, { failOn: "error", limitInputPixels: maxInputPixels })
    .rotate()
    .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true })
    .webp({ quality, effort: 5 })
    .toBuffer()
}

export { CatalogImageError, maxUploadBytes, prepareProductImage, prepareProductVariants, variantWidths }
