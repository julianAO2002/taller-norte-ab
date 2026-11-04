import type { MetadataRoute } from "next";

// Read SITE_URL at request time, not at build time.
export const dynamic = "force-dynamic";
import { CANONICAL_PATH } from "@/lib/experiment";

/** One indexable URL. Variants and previews are never listed. */
export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.SITE_URL ?? "http://localhost:3000";
  return [{ url: `${site}${CANONICAL_PATH}` }];
}
