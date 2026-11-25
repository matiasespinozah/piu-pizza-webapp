import type { NextConfig } from "next";

// Reglas de costo e imágenes: ver .agents/rules/cost-control.md y images-media.md

const isDev = process.env.NODE_ENV !== "production"

/**
 * CSP en dos capas. Producción no tiene otro ambiente donde ensayar y Cloudflare inyecta
 * su propio script, así que la política completa va solo en modo reporte
 * (`Content-Security-Policy-Report-Only`): el navegador avisa en la consola, no bloquea.
 * Cuando una revisión en producción no muestre violaciones, se mueve a `cspEnforced`.
 * Orígenes: Firebase Auth (solo el login del panel), fotos de la carta en Storage y el mapa.
 * `unsafe-inline` es necesario mientras las páginas sean estáticas (un nonce las volvería dinámicas).
 */
const cspEnforced = [
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ")

const cspReportOnly = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://firebasestorage.googleapis.com",
  "font-src 'self' data:",
  `connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com${isDev ? " http://127.0.0.1:* http://localhost:* ws://localhost:* ws://127.0.0.1:*" : ""}`,
  "frame-src https://www.google.com https://piu-pizza-cl.firebaseapp.com",
  "media-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  ...cspEnforced.split("; "),
].join("; ")

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,

  images: {
    // App Hosting fuerza `unoptimized: true` en cada build (adaptador de Next.js, `overrides.js`)
    // y `/_next/image` responde 404 en producción. Se declara aquí para que local y producción
    // se comporten igual. Las imágenes tienen que llegar livianas desde el origen:
    // ver .agents/rules/images-media.md.
    // Activarlo (`false`) corre sharp en Cloud Run y Cloudflare no cachea `/_next/image`:
    // más CPU y salida de datos. No hacerlo sin revisar costos.
    unoptimized: true,
    // Lo que sigue solo rige si algún día `unoptimized` pasa a false.
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [96, 256, 384],
    // 31 días: las imágenes de producto cambian de URL al reemplazarse (nombres versionados).
    minimumCacheTTL: 2678400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/v0/b/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "9199",
        pathname: "/v0/b/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "9199",
        pathname: "/v0/b/**",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: cspEnforced },
          { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
          // Sin includeSubDomains ni preload: no compromete otros subdominios del dominio.
          ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]),
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
      {
        // Archivos fijos de public/ (logo, íconos, ilustración sin foto). Sin hash en el nombre:
        // una semana, y si cambian se renueva en segundo plano. Antes Next los dejaba en 4 horas.
        source: "/not_image.png",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
      {
        source: "/logos/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
      {
        source: "/admin",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
      {
        source: "/admin/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
      {
        source: "/reservas/estado",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/api/reservations/status",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
