import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@veyrith/core";
import { getPublicSiteUrl } from "@veyrith/core/env";
import { serializeJsonLd } from "@veyrith/core/seo";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

async function findPublishedPage(slug: string) {
  if (["about", "account", "checkout", "products", "research"].includes(slug)) return null;
  const { data, error } = await getSupabaseAdmin()
    .from("Page")
    .select("*")
    .eq("slug", slug)
    .eq("status", "PUBLISHED")
    .maybeSingle();
  if (error) throw new Error(`Could not load page: ${error.message}`);
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await findPublishedPage(slug);
  if (!page) return { title: "Page not found", robots: { index: false, follow: false } };
  const canonical = page.canonicalUrl ?? `${getPublicSiteUrl()}/${page.slug}`;
  return {
    title: page.seoTitle ?? page.title,
    description: page.seoDescription ?? undefined,
    alternates: { canonical },
    openGraph: {
      title: page.seoTitle ?? page.title,
      description: page.seoDescription ?? undefined,
      url: canonical,
      images: page.openGraphImageId ? [{ url: `/api/media/${page.openGraphImageId}` }] : undefined,
    },
    robots: { index: page.robotsIndex, follow: true },
  };
}

export default async function CmsPage({ params }: Props) {
  const { slug } = await params;
  const page = await findPublishedPage(slug);
  if (!page) notFound();
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: getPublicSiteUrl() },
      { "@type": "ListItem", position: 2, name: page.title, item: page.canonicalUrl ?? `${getPublicSiteUrl()}/${page.slug}` },
    ],
  };
  return (
    <main>
      <nav aria-label="Breadcrumb" className="muted" style={{ paddingTop: 24 }}><a href="/">Home</a> / {page.title}</nav>
      <article className="hero"><h1>{page.title}</h1><p>{page.content}</p></article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }} />
    </main>
  );
}
