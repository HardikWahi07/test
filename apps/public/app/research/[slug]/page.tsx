import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@veyrith/core";
import { getPublicSiteUrl } from "@veyrith/core/env";
import { serializeJsonLd } from "@veyrith/core/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function findPost(slug: string) {
  const supabase = getSupabaseAdmin();
  const { data: post, error } = await supabase
    .from("BlogPost")
    .select("*")
    .eq("slug", slug)
    .eq("status", "PUBLISHED")
    .maybeSingle();
  if (error) throw new Error(`Could not load research article: ${error.message}`);
  if (!post) return null;
  const { data: category, error: categoryError } = post.categoryId
    ? await supabase.from("BlogCategory").select("name").eq("id", post.categoryId).maybeSingle()
    : { data: null, error: null };
  if (categoryError) throw new Error(`Could not load article category: ${categoryError.message}`);
  return { ...post, category };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await findPost(slug);
  if (!post) return { title: "Article not found", robots: { index: false, follow: false } };
  const canonical = post.canonicalUrl ?? `${getPublicSiteUrl()}/research/${post.slug}`;
  return {
    title: post.seoTitle ?? post.title,
    description: post.seoDescription ?? post.excerpt ?? undefined,
    alternates: { canonical },
    openGraph: { type: "article", title: post.seoTitle ?? post.title, description: post.seoDescription ?? post.excerpt ?? undefined, url: canonical },
    robots: { index: post.robotsIndex, follow: true },
  };
}

export default async function ResearchArticle({ params }: Props) {
  const { slug } = await params;
  const post = await findPost(slug);
  if (!post) notFound();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.seoDescription ?? post.excerpt ?? undefined,
    datePublished: post.publishedAt ?? undefined,
    dateModified: post.updatedAt,
    author: { "@type": "Organization", name: "Veyrith Labs" },
  };
  return (
    <main>
      <nav aria-label="Breadcrumb" className="muted" style={{ paddingTop: 24 }}><a href="/">Home</a> / <a href="/research">Research</a> / {post.title}</nav>
      <article className="hero">
        <span className="eyebrow">{post.category?.name ?? "Research"}</span>
        <h1>{post.title}</h1>
        {post.publishedAt && <p>{new Date(post.publishedAt).toLocaleDateString()}</p>}
        <p>{post.content}</p>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }} />
    </main>
  );
}
