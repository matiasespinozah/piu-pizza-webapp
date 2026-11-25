import type { MetadataRoute } from "next"

import { siteUrl } from "@/lib/site"

/** El panel, las APIs y el seguimiento de reservas no se indexan. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/reservas/estado"] }],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
