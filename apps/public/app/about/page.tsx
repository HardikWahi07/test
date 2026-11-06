import type { Metadata } from "next";
import Link from "next/link";
import { getSupabaseAdmin } from "@veyrith/core";
import { getPublicSiteUrl } from "@veyrith/core/env";
import { TiltCard } from "../components/tilt-card";

export const dynamic = "force-dynamic";

async function findAboutPage() {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("Page")
      .select("title,seoTitle,seoDescription,canonicalUrl,robotsIndex,content")
      .eq("slug", "about")
      .eq("status", "PUBLISHED")
      .maybeSingle();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await findAboutPage();
  return {
    title: page?.seoTitle ?? "About — Veyrith Labs",
    description: page?.seoDescription ?? "About Veyrith Labs, building Veyrith Code: local intelligence for serious coding.",
    alternates: { canonical: page?.canonicalUrl ?? `${getPublicSiteUrl()}/about` },
    robots: { index: page?.robotsIndex ?? true, follow: true },
  };
}

export default async function AboutPage() {
  const page = await findAboutPage();

  return (
    <main>
      <section className="page-hero">
        <div className="badge">
          <span className="badge-pulse" />
          <span>About Veyrith Labs</span>
        </div>
        <h1>{page?.title ?? "Independent systems. Thoughtful engineering."}</h1>
        <p>
          {page?.content ??
            "Veyrith Labs is an independent systems laboratory creating software and conducting applied engineering research. Veyrith Code is one of our products: a local-first, AI-enabled desktop coding environment powered by a bundled local model runtime."}
        </p>
      </section>

      {/* Core Studio Pillars */}
      <section className="grid-cards" style={{ marginTop: 24 }}>
        <TiltCard>
          <div className="feature-card-inner">
            <span className="card-num">CORE PURPOSE</span>
            <h3 className="card-title">Local Sovereignty</h3>
            <p className="card-desc">
              Your source code is your intellectual property. Veyrith Code is designed so that model inference, AST parsing, and agent actions run 100% locally on your machine, with zero telemetry or cloud dependencies.
            </p>
          </div>
        </TiltCard>

        <TiltCard>
          <div className="feature-card-inner">
            <span className="card-num">ARCHITECTURE</span>
            <h3 className="card-title">Bundled Runtime</h3>
            <p className="card-desc">
              We package optimized Qwen-based coding models (Q4_K_M quantization) and a pinned llama.cpp runtime directly with the desktop IDE, featuring Metal acceleration on Apple Silicon.
            </p>
          </div>
        </TiltCard>

        <TiltCard>
          <div className="feature-card-inner">
            <span className="card-num">EVALUATION</span>
            <h3 className="card-title">Rigorous Benchmark</h3>
            <p className="card-desc">
              We don&apos;t make unverified marketing claims. Our autonomous coding agents are tested against independent task verification harnesses and measured across real repository reproduction suites.
            </p>
          </div>
        </TiltCard>
      </section>

      {/* The 6 Architecture Guarantees */}
      <section className="comparison-section" style={{ margin: "50px 0" }}>
        <div style={{ maxWidth: 640 }}>
          <div className="section-eyebrow">Technical Principles</div>
          <h2 style={{ fontSize: "clamp(24px, 3vw, 34px)", margin: "8px 0 12px" }}>
            The Veyrith Code Standard
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Ground-level technical requirements enforced across our desktop IDE and model runtime:
          </p>
        </div>

        <div className="products-detailed-grid" style={{ marginTop: 32, marginBottom: 0 }}>
          <div className="product-deep-card">
            <span className="tech-tag" style={{ width: "fit-content", marginBottom: 12 }}>Standard 01</span>
            <h3>Zero Code Leakage</h3>
            <p>
              Your buffers, file trees, and terminal outputs never touch external cloud servers. You can safely build proprietary software, confidential client systems, and air-gapped repositories without security reviews.
            </p>
          </div>

          <div className="product-deep-card">
            <span className="tech-tag" style={{ width: "fit-content", marginBottom: 12 }}>Standard 02</span>
            <h3>Apple Silicon Metal Acceleration</h3>
            <p>
              The bundled inference engine hooks directly into unified memory on Apple Silicon (M1 through M4) with native Metal shaders, maximizing tokens-per-second while keeping thermal output low.
            </p>
          </div>

          <div className="product-deep-card">
            <span className="tech-tag" style={{ width: "fit-content", marginBottom: 12 }}>Standard 03</span>
            <h3>Audited Knowledge Assets</h3>
            <p>
              The local coding agent retrieves reference engineering knowledge from a locally bundled library of 1,321 qualified source-file assets sourced from 21 pinned repositories with license verification.
            </p>
          </div>

          <div className="product-deep-card">
            <span className="tech-tag" style={{ width: "fit-content", marginBottom: 12 }}>Standard 04</span>
            <h3>Explicit Permission Gates</h3>
            <p>
              Autonomous file modifications and workspace command executions are bounded by clear approval prompts. You maintain ultimate authority over what gets executed in your repository.
            </p>
          </div>

          <div className="product-deep-card">
            <span className="tech-tag" style={{ width: "fit-content", marginBottom: 12 }}>Standard 05</span>
            <h3>Pro Code Editor Integration</h3>
            <p>
              Built with Microsoft&apos;s Monaco Editor—the engine behind VS Code—offering full TypeScript language service support, multi-file tabs, syntax highlighting, and inline agent diff reviews.
            </p>
          </div>

          <div className="product-deep-card">
            <span className="tech-tag" style={{ width: "fit-content", marginBottom: 12 }}>Standard 06</span>
            <h3>Project Workspace Isolation</h3>
            <p>
              New projects are organized cleanly under ~/Veyrith Projects. The IDE restores recently opened projects seamlessly on launch while maintaining local Git branch awareness.
            </p>
          </div>
        </div>
      </section>

      {/* Collaboration / Contact Section */}
      <section className="principles-section">
        <div className="principles-header">
          <div className="section-eyebrow">Contact &amp; Inquiries</div>
          <h2>Reach the Engineering Team</h2>
          <p>
            Whether you have questions regarding Veyrith Code, want to report an issue, or discuss deployment across your team, our engineering team is available directly.
          </p>
          <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a className="btn btn-primary" href="mailto:support@veyrith-labs.com">
              support@veyrith-labs.com
            </a>
            <Link className="btn btn-secondary" href="/products">
              Explore Software
            </Link>
          </div>
        </div>

        <div className="principles-list">
          <div className="principle-item">
            <span className="principle-num">01</span>
            <div className="principle-content">
              <h3>Direct Support</h3>
              <p>Inquiries sent to support@veyrith-labs.com reach the developers building the IDE and model pipeline.</p>
            </div>
          </div>
          <div className="principle-item">
            <span className="principle-num">02</span>
            <div className="principle-content">
              <h3>Transparent Reporting</h3>
              <p>We publish our model evaluation records, memory measurements, and qualification manifests openly.</p>
            </div>
          </div>
          <div className="principle-item">
            <span className="principle-num">03</span>
            <div className="principle-content">
              <h3>Independent Direction</h3>
              <p>Self-funded and focused exclusively on delivering robust, local-first developer productivity.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
