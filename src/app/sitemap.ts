import type { MetadataRoute } from "next"

import { siteUrl } from "@/lib/site"

/** Solo las páginas públicas. Sin fechas: no hay una fecha real de cambio por página. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/carta`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/reservas`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/nosotros`, changeFrequency: "monthly", priority: 0.5 },
  ]
}
