import type { NextConfig } from "next";

// Reglas de costo e imágenes: ver .agents/rules/cost-control.md y images-media.md
const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,

  images: {
    // AVIF/WebP reducen el ancho de banda (el principal costo en App Hosting).
    formats: ["image/avif", "image/webp"],
    // Pocos tamaños = menos variantes que generar y cachear.
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [96, 256, 384],
    // 31 días: las imágenes de producto cambian de URL al reemplazarse (nombres versionados).
    minimumCacheTTL: 2678400,
    // Solo orígenes explícitos. Agregar el bucket de Firebase Storage cuando exista.
    remotePatterns: [],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
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
