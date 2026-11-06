import type { MetadataRoute } from "next";
import { getPublicSiteUrl } from "@veyrith/core/env";

export default function robots(): MetadataRoute.Robots {
  const PUBLIC_SITE_URL = getPublicSiteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/checkout", "/account"] }],
    sitemap: `${PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
