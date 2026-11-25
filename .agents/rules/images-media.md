# Imágenes y medios

Las fotos de pizza son lo que más pesa en el sitio y el ancho de banda es lo que más cuesta. Estas reglas son obligatorias.

> **En producción no hay optimizador de imágenes.** El adaptador de App Hosting fuerza `images.unoptimized = true` y `/_next/image` responde 404. `next/image` entrega el archivo tal cual, sin `srcSet`, sin AVIF y sin redimensionar. Por eso **cada imagen debe llegar optimizada desde el origen**: tamaño real de uso (con margen para pantallas 2×–3×), WebP o AVIF para fotos, PNG con paleta o SVG para logos e ilustraciones, y dentro del presupuesto de abajo. Un archivo de 1 MB mostrado a 52 px llega entero al celular. Verificar siempre con el build de producción y con `curl -I` de la URL publicada.

## Presupuesto de peso
| Tipo | Ancho máximo del original | Peso máximo |
|---|---|---|
| Hero / portada | 1920 px | 300 KB |
| Foto de producto | 1600 px | 400 KB |
| Miniatura | 400 px | 40 KB |
| Logo / íconos | SVG | 10 KB |
| **Página completa (primera carga)** | — | **≤ 1,5 MB** |

## Formato
- Fotos: **AVIF o WebP**, ya convertidas antes de subirlas o importarlas (Next.js no las convierte en producción). Nunca PNG para fotos.
- Logo e íconos: **SVG** optimizado.
- **Nunca** subir fotos crudas de cámara/celular (4–10 MB). Redimensionar antes de subir o al subir.

## Uso de `next/image`
- Siempre `next/image`, nunca `<img>` suelto.
- Siempre `sizes` realista (ej. `sizes="(max-width: 640px) 100vw, 33vw"`); sin `sizes` el navegador asume 100vw. En producción no cambia el archivo descargado, pero deja el código listo si algún día se activa el optimizador.
- `priority`/`preload` solo en la imagen LCP (la del hero). El resto, lazy (default).
- `placeholder="blur"` en imágenes importadas estáticamente.
- Imágenes fijas del sitio (hero, ambiente): **import estático** desde `src/assets/` → hash en el nombre y caché inmutable.
- No agregar tamaños a `deviceSizes`/`imageSizes` sin necesidad: cada variante se genera y cachea aparte.

## Imágenes subidas a Cloud Storage (productos)
- Solo admins suben. Validar en reglas de Storage: tipo `image/*` y tamaño `< 2 MB`.
- Ruta versionada e inmutable: `products/{productId}/{hash}.webp`. Al reemplazar una foto, se crea una ruta nueva (así la caché larga nunca muestra una imagen vieja).
- Cada foto se guarda en **tres tamaños**: la principal (hasta 1600 px) y dos versiones, `{hash}-900.webp` y `{hash}-360.webp`. Sus URLs van en el campo opcional `imageVariants` del producto (`{ thumb, medium }`) y en la carta pública. Como en producción no hay optimizador, `ProductImage` las usa con `srcset`: la miniatura de 96 px baja ~10 KB y no 160 KB. Si un producto no las tiene, o una no carga, se usa la principal.
- Al cambiar de foto se borran los tres archivos anteriores. Editar nombre o precio, y reimportar, conservan `imageVariants`: cualquier código que escriba un producto completo tiene que incluirlo.
- Metadata `Cache-Control: public, max-age=31536000, immutable` al subir.
- El dominio del bucket se declara en `images.remotePatterns` con `pathname` acotado, nunca comodines abiertos.
- Borrar del bucket las imágenes huérfanas al eliminar un producto.

## Video
- Evitar video autoplay. Si se necesita, MP4/WebM ≤ 2 MB, `muted`, `playsInline`, `preload="none"` y poster en AVIF. Para videos largos usar YouTube/Vimeo embebido con carga diferida.

## Fuentes
- Solo vía `next/font` (se sirven desde el propio dominio, sin requests a Google en runtime).
- Cargar solo los pesos usados (Anybody 400–900, Roboto Mono 500–700).
