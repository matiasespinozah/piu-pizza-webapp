import { getImageProps, type ImageProps, type StaticImageData } from "next/image"

type ResponsivePhotoProps = Omit<ImageProps, "src" | "srcSet"> & {
  /** La foto completa (1600 px o más). */
  src: StaticImageData
  /** La misma foto en ~1200 px, para celulares. */
  small: StaticImageData
}

/**
 * En producción no hay optimizador de imágenes (ver `.agents/rules/images-media.md`):
 * `next/image` entrega un solo archivo. Esta foto trae dos y el navegador elige según el
 * ancho que ocupa (`sizes`) y la densidad de la pantalla, así un celular no baja la de 1600 px.
 * Se conserva el desenfoque de carga y el resto de las props de `next/image`.
 */
function ResponsivePhoto({ src, small, sizes, alt, ...rest }: ResponsivePhotoProps) {
  const { props } = getImageProps({ ...rest, alt, src, sizes })
  const srcSet = `${small.src} ${small.width}w, ${src.src} ${src.width}w`
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} alt={alt} srcSet={srcSet} sizes={sizes} />
}

export { ResponsivePhoto }
