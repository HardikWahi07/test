import Link from "next/link";
import type { Metadata } from "next";
import { getSupabaseAdmin } from "@veyrith/core";
import { getPublicSiteUrl } from "@veyrith/core/env";
import { serializeJsonLd } from "@veyrith/core/seo";
import { Hero3D } from "./components/hero-3d";
import { TiltCard } from "./components/tilt-card";

export const dynamic = "force-dynamic";

type ProductRecord = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  priceMinor: number;
  currency: string;
  status: string;
  features?: string[] | null;
  releaseVersion?: string | null;
};

async function findHomePage() {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("Page")
      .select("title,content,seoTitle,seoDescription,canonicalUrl,robotsIndex,openGraphImageId")
      .eq("slug", "home")
      .eq("status", "PUBLISHED")
      .maybeSingle();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

async function findPublishedProducts(): Promise<ProductRecord[]> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("Product")
      .select("id,name,slug,shortDescription,description,priceMinor,currency,status,features,releaseVersion")
      .eq("isPublished", true)
      .in("status", ["AVAILABLE", "BETA", "COMING_SOON"])
      .order("publishedAt", { ascending: false });

    if (error || !data) return [];
    return data as ProductRecord[];
  } catch {
    return [];
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await findHomePage();
  return {
    title: page?.seoTitle ?? "Veyrith Code — Local Intelligence. Serious Coding.",
    description: page?.seoDescription ?? "A local-first, AI-native desktop coding environment powered by bundled, private local intelligence.",
    alternates: { canonical: page?.canonicalUrl ?? getPublicSiteUrl() },
    robots: { index: page?.robotsIndex ?? true, follow: true },
    openGraph: {
      title: page?.seoTitle ?? "Veyrith Code — Local Intelligence. Serious Coding.",
      description: page?.seoDescription ?? "A local-first, AI-native desktop coding environment powered by bundled, private local intelligence.",
      images: [{ url: "/brand/331f4053-0c92-4d3e-b0f0-4e81f1315455.jpeg" }],
    },
  };
}

export default async function HomePage() {
  const [page, products] = await Promise.all([findHomePage(), findPublishedProducts()]);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: getPublicSiteUrl() }],
  };

  return (
    <main>
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-copy">
          <div className="badge">
            <span className="badge-pulse" />
            <span>Independent Systems Lab</span>
          </div>

          <h1 className="hero-title">
            {page?.title ? (
              page.title
            ) : (
              <>
                Local intelligence.
                <br />
                <span className="gradient-text">Serious coding.</span>
              </>
            )}
          </h1>

          <p className="hero-description">
            {page?.content ??
              "Your code. Your machine. Your intelligence. Veyrith Code is a local-first, AI-native desktop coding environment powered by a bundled, optimized local LLM runtime. Zero code ever leaves your machine."}
          </p>

          <div className="hero-actions">
            <Link className="btn btn-primary" href="/products">
              Explore Veyrith Code
            </Link>
            <Link className="btn btn-secondary" href="/compatibility">
              Check Hardware
            </Link>
          </div>
        </div>

        {/* 3D Holographic Interactive Emblem */}
        <Hero3D />
      </section>

      {/* Engineering Benchmarks Bar */}
      <section className="architecture-specs-grid" aria-label="Engineering Benchmarks">
        <div className="spec-box">
          <span className="spec-number">100%</span>
          <span className="spec-label">Private &amp; Offline</span>
          <p className="spec-desc">Model execution and context streaming run directly on your hardware via pinned llama.cpp runtime. Zero network round-trips.</p>
        </div>

        <div className="spec-box">
          <span className="spec-number">Metal</span>
          <span className="spec-label">Hardware Acceleration</span>
          <p className="spec-desc">Native Apple Silicon Metal GPU acceleration and optimized quantized weights (Q4_K_M) for high-efficiency local inference.</p>
        </div>

        <div className="spec-box">
          <span className="spec-number">1,321</span>
          <span className="spec-label">Audited Knowledge Assets</span>
          <p className="spec-desc">Locally bundled engineering library sourced from 21 pinned repositories with license verification and secret screening.</p>
        </div>

        <div className="spec-box">
          <span className="spec-number">Monaco</span>
          <span className="spec-label">Pro Code Editor</span>
          <p className="spec-desc">Professional editor engine with full TypeScript/LSP support, inline agent diffs, terminal execution, and Git tracking.</p>
        </div>
      </section>

      {/* Hardware Compatibility Diagnostic Banner */}
      <section style={{ margin: "10px 0 50px" }} aria-label="Hardware Compatibility Tool">
        <div style={{
          background: "var(--surface-card)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: "26px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 20
        }}>
          <div>
            <div className="section-eyebrow">Hardware Diagnostic &bull; SEO Tool</div>
            <h3 style={{ fontSize: 19, margin: "4px 0 6px", fontWeight: 700 }}>Can your machine run Veyrith Code locally?</h3>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: 0, maxWidth: 640 }}>
              Enter your RAM, processor family, and GPU compute specs to calculate expected local token generation speed, Metal/CUDA status, and context limits.
            </p>
          </div>
          <Link className="btn btn-primary" href="/compatibility" style={{ whiteSpace: "nowrap" }}>
            Run Compatibility Check
          </Link>
        </div>
      </section>

      {/* Dynamic Products Section fetched from Supabase */}
      <section aria-label="Veyrith Code Products">
        <div className="section-title-wrap">
          <div className="section-eyebrow">Catalogue &bull; Supabase Live Sync</div>
          <h2 className="section-title">Engineered for autonomous coding</h2>
          <p className="section-subtitle">
            Explore our production-grade software editions, runtimes, and local knowledge packs.
          </p>
        </div>

        {products.length > 0 ? (
          <div className="products-detailed-grid">
            {products.map((product) => {
              const displayPrice = product.priceMinor === 0
                ? "Free Developer Preview"
                : new Intl.NumberFormat("en-IN", { style: "currency", currency: product.currency }).format(product.priceMinor / 100);

              return (
                <TiltCard key={product.slug}>
                  <div className="product-deep-card" style={{ height: "100%" }}>
                    <div className="product-badge-row">
                      <span className="tech-tag">{product.status.replace("_", " ")}</span>
                      {product.releaseVersion && (
                        <span className="tech-tag">v{product.releaseVersion}</span>
                      )}
                    </div>
                    <h3>{product.name}</h3>
                    <p>{product.shortDescription}</p>

                    {product.features && product.features.length > 0 && (
                      <ul className="product-features-list">
                        {product.features.slice(0, 4).map((feat, idx) => (
                          <li key={idx}>
                            <span className="feature-bullet">[+]</span>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div style={{ marginTop: "auto", paddingTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--accent-light)", fontWeight: 600 }}>
                        {displayPrice}
                      </span>
                      <Link className="btn btn-secondary" href={`/products/${product.slug}`} style={{ fontSize: 13, padding: "8px 16px" }}>
                        Inspect Specs
                      </Link>
                    </div>
                  </div>
                </TiltCard>
              );
            })}
          </div>
        ) : (
          <div className="product-deep-card" style={{ maxWidth: 640, textAlign: "center", padding: "48px 36px" }}>
            <div className="section-eyebrow" style={{ marginBottom: 10 }}>Database Synced</div>
            <h3 style={{ margin: "0 0 10px" }}>Product catalogue is live via Supabase</h3>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-muted)", margin: "0 0 24px" }}>
              Products are dynamically fetched from the Supabase database. Add entries through the admin CMS to populate this section.
            </p>
            <Link className="btn btn-secondary" href="/products">
              View Full Catalogue
            </Link>
          </div>
        )}
      </section>

      {/* Architectural Comparison Table */}
      <section className="comparison-section" aria-label="Architectural Comparison">
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
          <div className="section-eyebrow">Privacy &amp; Architecture Matrix</div>
          <h2 style={{ fontSize: "clamp(26px, 3.2vw, 38px)", margin: "8px 0 12px" }}>Local-First vs Cloud AI Editors</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Compare Veyrith Code's zero-cloud architecture with conventional cloud-based AI code assistants:
          </p>
        </div>

        <div className="table-wrap">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Evaluation Metric</th>
                <th className="highlight-col">Veyrith Code (Local-First)</th>
                <th>Cloud-Based AI Editors</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Code Confidentiality</strong></td>
                <td className="highlight-col"><span className="pill-good">[PASS] 100% on-device</span> (Never sent over network)</td>
                <td><span className="pill-bad">[RISK] Uploads code</span> to remote third-party servers</td>
              </tr>
              <tr>
                <td><strong>Internet Independence</strong></td>
                <td className="highlight-col"><span className="pill-good">[PASS] Works 100% offline</span> (Zero network required)</td>
                <td><span className="pill-bad">[FAIL] Completely disabled</span> during internet outages</td>
              </tr>
              <tr>
                <td><strong>Model Infrastructure</strong></td>
                <td className="highlight-col"><span className="pill-good">[PASS] Bundled local GGUF</span> &amp; llama.cpp runtime</td>
                <td><span className="pill-bad">[RISK] Closed remote APIs</span> with rate limits &amp; queues</td>
              </tr>
              <tr>
                <td><strong>Engineering Knowledge</strong></td>
                <td className="highlight-col"><span className="pill-good">[PASS] 1,321 audited local</span> source-file assets</td>
                <td><span className="pill-bad">[RISK] Cloud vector search</span> with unknown provenance</td>
              </tr>
              <tr>
                <td><strong>Tool Approvals</strong></td>
                <td className="highlight-col"><span className="pill-good">[PASS] Strict approval gates</span> on file &amp; shell actions</td>
                <td><span className="pill-bad">[RISK] Varied execution</span> models in remote sandboxes</td>
              </tr>
              <tr>
                <td><strong>Data Retention</strong></td>
                <td className="highlight-col"><span className="pill-good">[PASS] Zero data retained</span> or trained upon</td>
                <td><span className="pill-bad">[RISK] Subject to cloud</span> privacy policy revisions</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Technical FAQ */}
      <section className="faq-section" aria-label="Frequently Asked Questions">
        <div className="section-title-wrap">
          <div className="section-eyebrow">Technical FAQ</div>
          <h2 className="section-title">Common questions &amp; specifications</h2>
          <p className="section-subtitle">
            Direct details regarding hardware requirements, models, and platform support.
          </p>
        </div>

        <div className="faq-grid">
          <div className="faq-card">
            <h4>What hardware is required to run Veyrith Code?</h4>
            <p>
              Veyrith Code is optimized for Apple Silicon (M1/M2/M3/M4 with 16GB+ unified memory recommended) leveraging native Metal GPU acceleration. Windows packaging scripts are provided, with x86_64 runtime verification in active development.
            </p>
          </div>

          <div className="faq-card">
            <h4>What model powers the local agent?</h4>
            <p>
              The baseline release bundles an optimized Qwen3.5-9B Q4_K_M artifact served by a pinned llama.cpp runtime. The model weights are stored locally inside the application bundle, completely bypassing cloud inference.
            </p>
          </div>

          <div className="faq-card">
            <h4>Does Veyrith Code require an internet connection?</h4>
            <p>
              No. The IDE, code parser, local model server, and 1,321-file engineering knowledge pack are 100% self-contained on your disk. You can build, edit, and use the AI agent completely offline.
            </p>
          </div>

          <div className="faq-card">
            <h4>Where can I reach the engineering team?</h4>
            <p>
              For technical inquiries, bug reports, or partnership discussions, you can reach our core engineering team directly at support@veyrith-labs.com.
            </p>
          </div>
        </div>
      </section>

      {/* Studio Manifesto Banner */}
      <section className="principles-section" aria-label="Studio Principles">
        <div className="principles-header">
          <div className="section-eyebrow">Core Philosophy</div>
          <h2>Your code belongs on your machine.</h2>
          <p>
            Veyrith Labs was founded on the belief that developers should never have to surrender proprietary source code or intellectual property to enjoy AI-accelerated workflows.
          </p>
          <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="btn btn-primary" href="/products">
              Explore Veyrith Code
            </Link>
            <Link className="btn btn-secondary" href="/about">
              Read Studio Manifesto
            </Link>
          </div>
        </div>

        <div className="principles-list">
          <div className="principle-item">
            <span className="principle-num">01</span>
            <div className="principle-content">
              <h3>Total Confidentiality</h3>
              <p>Zero telemetry, zero remote model training, and zero proprietary code transmitted over public networks.</p>
            </div>
          </div>

          <div className="principle-item">
            <span className="principle-num">02</span>
            <div className="principle-content">
              <h3>Hardware-Native Acceleration</h3>
              <p>Harnessing unified memory and Metal compute pipelines to deliver responsive local code generation.</p>
            </div>
          </div>

          <div className="principle-item">
            <span className="principle-num">03</span>
            <div className="principle-content">
              <h3>Verifiable Evaluation</h3>
              <p>We measure autonomous coding with independent verification harnesses and publish real evaluation reports.</p>
            </div>
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
    </main>
  );
}
