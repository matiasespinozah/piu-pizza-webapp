# Imágenes y medios

Las fotos de pizza son lo que más pesa en el sitio y el ancho de banda es lo que más cuesta. Estas reglas son obligatorias.

## Presupuesto de peso
| Tipo | Ancho máximo del original | Peso máximo |
|---|---|---|
| Hero / portada | 1920 px | 300 KB |
| Foto de producto | 1200 px | 150 KB |
| Miniatura | 400 px | 40 KB |
| Logo / íconos | SVG | 10 KB |
| **Página completa (primera carga)** | — | **≤ 1,5 MB** |

## Formato
- Fotos: **AVIF o WebP** (Next.js entrega AVIF/WebP automáticamente; ver `next.config.ts`). Nunca PNG para fotos.
- Logo e íconos: **SVG** optimizado.
- **Nunca** subir fotos crudas de cámara/celular (4–10 MB). Redimensionar antes de subir o al subir.

## Uso de `next/image`
- Siempre `next/image`, nunca `<img>` suelto.
- Siempre `sizes` realista (ej. `sizes="(max-width: 640px) 100vw, 33vw"`); sin `sizes` se descarga la variante más grande.
- `priority`/`preload` solo en la imagen LCP (la del hero). El resto, lazy (default).
- `placeholder="blur"` en imágenes importadas estáticamente.
- Imágenes fijas del sitio (hero, ambiente): **import estático** desde `src/assets/` → hash en el nombre y caché inmutable.
- No agregar tamaños a `deviceSizes`/`imageSizes` sin necesidad: cada variante se genera y cachea aparte.

## Imágenes subidas a Cloud Storage (productos)
- Solo admins suben. Validar en reglas de Storage: tipo `image/*` y tamaño `< 2 MB`.
- Ruta versionada e inmutable: `products/{productId}/{hash}.webp`. Al reemplazar una foto, se crea una ruta nueva (así la caché larga nunca muestra una imagen vieja).
- Metadata `Cache-Control: public, max-age=31536000, immutable` al subir.
- El dominio del bucket se declara en `images.remotePatterns` con `pathname` acotado, nunca comodines abiertos.
- Borrar del bucket las imágenes huérfanas al eliminar un producto.

## Video
- Evitar video autoplay. Si se necesita, MP4/WebM ≤ 2 MB, `muted`, `playsInline`, `preload="none"` y poster en AVIF. Para videos largos usar YouTube/Vimeo embebido con carga diferida.

## Fuentes
- Solo vía `next/font` (se sirven desde el propio dominio, sin requests a Google en runtime).
- Cargar solo los pesos usados (Anybody 400–900, Roboto Mono 500–700).
