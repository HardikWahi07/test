import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@veyrith/core";
import { getPublicSiteUrl } from "@veyrith/core/env";
import { serializeJsonLd } from "@veyrith/core/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function findPublishedProduct(slug: string) {
  const supabase = getSupabaseAdmin();
  const { data: product, error } = await supabase
    .from("Product")
    .select("*")
    .eq("slug", slug)
    .eq("isPublished", true)
    .in("status", ["AVAILABLE", "BETA", "COMING_SOON"])
    .maybeSingle();

  if (error || !product) return null;

  const [categoryResult, imagesResult, mediaResult] = await Promise.all([
    supabase.from("ProductCategory").select("*").eq("id", product.categoryId).maybeSingle(),
    supabase.from("ProductImage").select("*").eq("productId", product.id).order("sortOrder", { ascending: true }),
    product.logoMediaAssetId
      ? supabase.from("MediaAsset").select("*").eq("id", product.logoMediaAssetId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const category = categoryResult.data ?? { name: "Software Edition", slug: "software" };
  const images = imagesResult.data ?? [];
  const imageIds = images.map((image) => image.mediaAssetId);

  const { data: imageAssets } = imageIds.length
    ? await supabase.from("MediaAsset").select("*").in("id", imageIds)
    : { data: [] };

  const assetsById = new Map((imageAssets ?? []).map((asset) => [asset.id, asset]));

  return {
    ...product,
    category,
    logoMediaAsset: mediaResult.data,
    images: images.map((image) => ({ ...image, mediaAsset: assetsById.get(image.mediaAssetId) })),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await findPublishedProduct(slug);
  if (!product) return { title: "Product Not Found", robots: { index: false, follow: false } };

  const PUBLIC_SITE_URL = getPublicSiteUrl();
  const canonical = product.canonicalUrl ?? `${PUBLIC_SITE_URL}/products/${product.slug}`;
  const image = product.logoMediaAsset;

  return {
    title: product.seoTitle ?? `${product.name} — Veyrith Code`,
    description: product.seoDescription ?? product.shortDescription,
    alternates: { canonical },
    openGraph: {
      title: product.seoTitle ?? `${product.name} — Veyrith Code`,
      description: product.seoDescription ?? product.shortDescription,
      url: canonical,
      images: image ? [{ url: `/api/media/${image.id}` }] : [{ url: "/brand/331f4053-0c92-4d3e-b0f0-4e81f1315455.jpeg" }],
    },
    robots: { index: true, follow: true },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = await findPublishedProduct(slug);
  if (!product) notFound();

  const PUBLIC_SITE_URL = getPublicSiteUrl();
  const displayPrice = product.priceMinor === 0
    ? "Free Developer Preview"
    : new Intl.NumberFormat("en-IN", { style: "currency", currency: product.currency }).format(product.priceMinor / 100);

  const offer = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: product.name,
    description: product.shortDescription,
    applicationCategory: product.category.name,
    operatingSystem: "macOS, Windows",
    image: product.logoMediaAsset ? `${PUBLIC_SITE_URL}/api/media/${product.logoMediaAsset.id}` : undefined,
    offers: {
      "@type": "Offer",
      price: (product.priceMinor / 100).toFixed(2),
      priceCurrency: product.currency,
      availability: product.status === "AVAILABLE"
        ? "https://schema.org/InStock"
        : "https://schema.org/PreOrder",
      url: `${PUBLIC_SITE_URL}/products/${product.slug}`,
    },
  };

  const checkoutUrl = (platform: "MACOS" | "WINDOWS") =>
    `/checkout?product=${encodeURIComponent(product.slug)}&platform=${platform}`;

  return (
    <main style={{ paddingBottom: 80 }}>
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" style={{ padding: "24px 0 12px", fontSize: 13, color: "var(--text-muted)" }}>
        <Link href="/" style={{ color: "var(--text-muted)" }}>Home</Link>
        <span style={{ margin: "0 8px", opacity: 0.5 }}>/</span>
        <Link href="/products" style={{ color: "var(--text-muted)" }}>Products</Link>
        <span style={{ margin: "0 8px", opacity: 0.5 }}>/</span>
        <span style={{ color: "var(--text)" }}>{product.name}</span>
      </nav>

      {/* Hero / Overview */}
      <section className="page-hero" style={{ maxWidth: 880 }}>
        <div className="product-badge-row">
          <span className="tech-tag">{product.category.name}</span>
          <span className="tech-tag">{product.status.replace("_", " ")}</span>
          {product.releaseVersion && <span className="tech-tag">v{product.releaseVersion}</span>}
        </div>

        <h1 style={{ fontSize: "clamp(36px, 4.5vw, 56px)", margin: "14px 0 16px" }}>
          {product.name}
        </h1>

        <p style={{ fontSize: 18, lineHeight: 1.7, color: "var(--text)", marginBottom: 12 }}>
          {product.shortDescription}
        </p>

        <p style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text-muted)", marginBottom: 32 }}>
          {product.description}
        </p>
      </section>

      {/* Download & Installation Card */}
      <section style={{ maxWidth: 880, marginBottom: 48 }}>
        <div className="product-deep-card" style={{ padding: 36 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
            <div>
              <div className="section-eyebrow">Distribution &amp; Release</div>
              <h2 style={{ fontSize: 24, margin: "6px 0 8px", fontWeight: 700 }}>
                {displayPrice}
              </h2>
              <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: 0, maxWidth: 480 }}>
                Self-contained, air-gapped installation package. Zero cloud telemetry and zero external network pings during runtime.
              </p>
            </div>

            {product.status !== "COMING_SOON" ? (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <Link className="btn btn-primary" href={checkoutUrl("MACOS")}>
                  Download macOS Bundle
                </Link>
                <Link className="btn btn-secondary" href={checkoutUrl("WINDOWS")}>
                  Windows Installer
                </Link>
              </div>
            ) : (
              <div className="badge">
                <span className="badge-pulse" />
                <span>Coming Soon — Access in Review</span>
              </div>
            )}
          </div>

          <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid var(--border-subtle)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent)", textTransform: "uppercase" }}>Target Platform</div>
              <div style={{ fontSize: 13.5, color: "var(--text)", marginTop: 4 }}>Apple Silicon (Metal) / Windows x64</div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent)", textTransform: "uppercase" }}>Runtime Security</div>
              <div style={{ fontSize: 13.5, color: "var(--text)", marginTop: 4 }}>100% Offline &amp; Air-Gapped</div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent)", textTransform: "uppercase" }}>Model Engine</div>
              <div style={{ fontSize: 13.5, color: "var(--text)", marginTop: 4 }}>llama.cpp Q4_K_M Bundled</div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Architecture Matrix */}
      {product.features && product.features.length > 0 && (
        <section style={{ maxWidth: 880, marginBottom: 48 }}>
          <div className="section-eyebrow">Technical Specifications</div>
          <h2 style={{ fontSize: 26, margin: "8px 0 20px" }}>Core Capabilities</h2>

          <div style={{ background: "var(--surface-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "28px 32px" }}>
            <ul className="product-features-list" style={{ borderTop: "none", paddingTop: 0, margin: 0, gap: 14 }}>
              {product.features.map((feature: string, idx: number) => (
                <li key={idx} style={{ fontSize: 14.5 }}>
                  <span className="feature-bullet">[+]</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Media & Screenshots */}
      {product.images && product.images.length > 0 && (
        <section style={{ maxWidth: 880, marginBottom: 48 }}>
          <div className="section-eyebrow">Interface &amp; Artifacts</div>
          <h2 style={{ fontSize: 26, margin: "8px 0 20px" }}>Product Screenshots</h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {product.images.map(({ id, altText, mediaAsset }: { id: string; altText: string; mediaAsset?: { id: string } | null }) => (
              mediaAsset ? (
                <figure key={id} style={{ margin: 0, borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border)" }}>
                  <img
                    src={`/api/media/${mediaAsset.id}`}
                    alt={altText}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </figure>
              ) : null
            ))}
          </div>
        </section>
      )}

      {/* Technical FAQ CTA */}
      <section style={{ maxWidth: 880 }}>
        <div style={{ background: "var(--surface-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "28px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h3 style={{ margin: "0 0 6px", fontSize: 18 }}>Have technical architecture questions?</h3>
            <p style={{ margin: 0, fontSize: 13.5, color: "var(--text-muted)" }}>
              Reach out to our core systems engineering team for deep specifications or integration guides.
            </p>
          </div>
          <Link className="btn btn-secondary" href="/contact">
            Contact Engineering
          </Link>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(offer) }}
      />
    </main>
  );
}
