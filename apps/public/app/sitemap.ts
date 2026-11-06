import type { MetadataRoute } from "next";
import { getSupabaseAdmin } from "@veyrith/core";
import { getPublicSiteUrl } from "@veyrith/core/env";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const PUBLIC_SITE_URL = getPublicSiteUrl();
  const supabase = getSupabaseAdmin();
  const [productsResult, pagesResult, postsResult] = await Promise.all([
    supabase.from("Product").select("slug,updatedAt").eq("isPublished", true).in("status", ["AVAILABLE", "BETA", "COMING_SOON"]),
    supabase.from("Page").select("slug,updatedAt").eq("status", "PUBLISHED").eq("robotsIndex", true),
    supabase.from("BlogPost").select("slug,updatedAt").eq("status", "PUBLISHED").eq("robotsIndex", true),
  ]);
  if (productsResult.error || pagesResult.error || postsResult.error) {
    throw new Error(`Could not load sitemap content: ${productsResult.error?.message ?? pagesResult.error?.message ?? postsResult.error?.message}`);
  }
  const products = productsResult.data;
  const pages = pagesResult.data;
  const posts = postsResult.data;
  return [
    { url: PUBLIC_SITE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${PUBLIC_SITE_URL}/compatibility`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${PUBLIC_SITE_URL}/products`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    ...products.map((product) => ({
      url: `${PUBLIC_SITE_URL}/products/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...pages.map((page) => ({
      url: page.slug === "home" ? PUBLIC_SITE_URL : `${PUBLIC_SITE_URL}/${page.slug}`,
      lastModified: page.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...posts.map((post) => ({
      url: `${PUBLIC_SITE_URL}/research/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
