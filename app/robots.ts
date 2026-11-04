import type { MetadataRoute } from "next";

// Read SITE_URL at request time, not at build time.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.SITE_URL ?? "http://localhost:3000";
  return {
    rules: { userAgent: "*", allow: "/practica", disallow: "/bitacora" },
    sitemap: `${site}/sitemap.xml`,
  };
}
