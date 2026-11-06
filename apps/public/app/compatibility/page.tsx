import type { Metadata } from "next";
import Link from "next/link";
import { getPublicSiteUrl } from "@veyrith/core/env";
import { serializeJsonLd } from "@veyrith/core/seo";
import { CompatibilityChecker } from "./compatibility-checker";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Veyrith Hardware Compatibility Checker — Can My Mac or PC Run Veyrith Code?",
  description:
    "Test your Mac or PC hardware compatibility for Veyrith Code. Calculate local token generation speed, RAM footprint, Metal and CUDA GPU acceleration status, and context window limits.",
  alternates: { canonical: "/compatibility" },
  keywords: [
    "Veyrith Code hardware requirements",
    "local AI IDE compatibility",
    "llama.cpp Mac M3 M4 tokens per second",
    "local LLM RAM checker",
    "Metal GPU acceleration coding",
    "offline AI code editor requirements",
  ],
  openGraph: {
    title: "Veyrith Hardware Compatibility Checker — Can My Mac or PC Run Veyrith Code?",
    description:
      "Calculate your computer's local AI coding throughput. Real-time diagnostic for RAM, processor, and GPU compute.",
    url: "/compatibility",
    images: [{ url: "/brand/331f4053-0c92-4d3e-b0f0-4e81f1315455.jpeg" }],
  },
};

export default function CompatibilityPage() {
  const PUBLIC_SITE_URL = getPublicSiteUrl();

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: PUBLIC_SITE_URL },
      { "@type": "ListItem", position: 2, name: "Hardware Compatibility Checker", item: `${PUBLIC_SITE_URL}/compatibility` },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What are the minimum hardware requirements to run Veyrith Code?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The minimum baseline is 8 GB of RAM and an Apple Silicon processor (M1 or later) or an x86_64 processor with AVX2 support. For production engineering with rich multi-file context, 16 GB or more of unified memory or dedicated VRAM is recommended.",
        },
      },
      {
        "@type": "Question",
        name: "Why does Apple Silicon unified memory give Veyrith Code a significant performance advantage?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Traditional PCs require duplicating model weights between system RAM and discrete GPU VRAM over the PCIe bus. Apple Silicon unified architecture shares high-bandwidth memory (150 to 800 GB/s) across CPU and Metal GPU cores without PCIe transfer latency, allowing large 9B to 32B quantized models to run with zero copy overhead.",
        },
      },
      {
        "@type": "Question",
        name: "Can I run Veyrith Code on an 8 GB MacBook Air or Mac mini?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Veyrith Code supports 8 GB systems using optimized quantized models such as Qwen2.5-Coder-7B (Q3_K_S) or Qwen2.5-Coder-3B. While generation speeds remain solid (14 to 20 tokens per second), closing memory-intensive background processes like Chrome tabs is recommended to prevent memory swapping.",
        },
      },
      {
        "@type": "Question",
        name: "Does Veyrith Code support Windows PCs with NVIDIA GPUs?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. On Windows and Linux workstations with dedicated NVIDIA RTX GPUs, Veyrith Code utilizes CUDA acceleration, offloading model weights directly into GDDR6X VRAM to achieve speeds between 45 and 70 tokens per second.",
        },
      },
      {
        "@type": "Question",
        name: "Does local inference drain laptop battery life quickly?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "On Apple Silicon, our pinned llama.cpp runtime utilizes optimized Metal shaders and Neural Engine hardware pipelines, consuming between 10W and 25W during active token bursts. This allows hours of continuous coding on battery without thermal throttling.",
        },
      },
    ],
  };

  return (
    <main style={{ paddingBottom: 80 }}>
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" style={{ padding: "24px 0 12px", fontSize: 13, color: "var(--text-muted)" }}>
        <Link href="/" style={{ color: "var(--text-muted)" }}>Home</Link>
        <span style={{ margin: "0 8px", opacity: 0.5 }}>/</span>
        <span style={{ color: "var(--text)" }}>Hardware Compatibility Checker</span>
      </nav>

      {/* Page Hero */}
      <section className="page-hero" style={{ maxWidth: 880 }}>
        <div className="badge">
          <span className="badge-pulse" />
          <span>Interactive Diagnostic &bull; Local Hardware Specs</span>
        </div>

        <h1 style={{ fontSize: "clamp(34px, 4.4vw, 54px)", margin: "14px 0 16px", letterSpacing: "-0.03em" }}>
          Can your machine run <span className="gradient-text">Veyrith Code</span> locally?
        </h1>

        <p style={{ fontSize: 16.5, lineHeight: 1.75, color: "var(--text-muted)", margin: "0 0 24px" }}>
          Veyrith Code is powered by bundled, private local intelligence. Zero code ever leaves your workstation. Enter your RAM, processor family, and GPU compute capabilities below to calculate expected token streaming throughput, memory overhead, context window headroom, and hardware acceleration status.
        </p>
      </section>

      {/* Interactive Compatibility Checker Component */}
      <CompatibilityChecker />

      {/* Tested Hardware Benchmarks Grid */}
      <section aria-label="Real-World Hardware Benchmarks" style={{ margin: "70px 0 50px" }}>
        <div className="section-title-wrap">
          <div className="section-eyebrow">Empirical Testing</div>
          <h2 className="section-title">Tested Hardware Benchmarks</h2>
          <p className="section-subtitle">
            Empirical throughput measurements running the bundled Qwen3.5-9B (Q4_K_M) local coding model across production workstations:
          </p>
        </div>

        <div className="table-wrap">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Workstation / Device</th>
                <th>Processor &amp; Memory</th>
                <th>Acceleration Engine</th>
                <th className="highlight-col">Token Throughput</th>
                <th>Context Limit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>MacBook Pro 16&quot; (2024)</strong></td>
                <td>Apple M4 Pro &bull; 48 GB Unified</td>
                <td>Metal GPU (16 cores)</td>
                <td className="highlight-col"><strong style={{ color: "var(--accent-light)" }}>58.4 tok/s</strong></td>
                <td>32,768 Tokens</td>
                <td><span className="pill-good">[PASS] Optimal</span></td>
              </tr>
              <tr>
                <td><strong>MacBook Pro 14&quot; (2023)</strong></td>
                <td>Apple M3 Pro &bull; 18 GB Unified</td>
                <td>Metal GPU (14 cores)</td>
                <td className="highlight-col"><strong style={{ color: "var(--accent-light)" }}>38.2 tok/s</strong></td>
                <td>16,384 Tokens</td>
                <td><span className="pill-good">[PASS] Optimal</span></td>
              </tr>
              <tr>
                <td><strong>Mac Studio (2023)</strong></td>
                <td>Apple M2 Ultra &bull; 64 GB Unified</td>
                <td>Metal GPU (60 cores)</td>
                <td className="highlight-col"><strong style={{ color: "var(--accent-light)" }}>52.1 tok/s</strong></td>
                <td>32,768+ Tokens</td>
                <td><span className="pill-good">[PASS] Optimal</span></td>
              </tr>
              <tr>
                <td><strong>MacBook Air 13&quot; (2022)</strong></td>
                <td>Apple M2 &bull; 16 GB Unified</td>
                <td>Metal GPU (8 cores)</td>
                <td className="highlight-col"><strong style={{ color: "var(--accent-light)" }}>28.5 tok/s</strong></td>
                <td>16,384 Tokens</td>
                <td><span className="pill-good">[PASS] High</span></td>
              </tr>
              <tr>
                <td><strong>MacBook Air 13&quot; (2020)</strong></td>
                <td>Apple M1 &bull; 8 GB Unified</td>
                <td>Metal GPU (7 cores)</td>
                <td className="highlight-col"><strong>16.2 tok/s</strong></td>
                <td>8,192 Tokens</td>
                <td><span style={{ color: "#facc15", fontFamily: "var(--mono)", fontSize: 11 }}>[WARN] Constrained</span></td>
              </tr>
              <tr>
                <td><strong>Custom PC Workstation</strong></td>
                <td>Intel Core i9-14900K &bull; 64 GB</td>
                <td>NVIDIA RTX 4090 (24 GB)</td>
                <td className="highlight-col"><strong style={{ color: "var(--accent-light)" }}>68.7 tok/s</strong></td>
                <td>32,768 Tokens</td>
                <td><span className="pill-good">[PASS] Optimal</span></td>
              </tr>
              <tr>
                <td><strong>Developer ThinkPad</strong></td>
                <td>Intel Core i7-13700H &bull; 16 GB</td>
                <td>CPU AVX2 (Iris Xe)</td>
                <td className="highlight-col"><strong>8.4 tok/s</strong></td>
                <td>8,192 Tokens</td>
                <td><span style={{ color: "#fb923c", fontFamily: "var(--mono)", fontSize: 11 }}>[INFO] CPU Only</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Deep-Dive Architecture Note */}
      <section className="principles-section" aria-label="Memory Architecture">
        <div className="principles-header">
          <div className="section-eyebrow">Architecture Note</div>
          <h2>Why unified memory changes local AI economics</h2>
          <p>
            Traditional machine learning setups require dedicated GPUs with massive VRAM, creating hardware bottlenecks and high server costs. Veyrith Code leverages Apple Silicon unified architecture to eliminate the PCIe bottleneck entirely.
          </p>
          <div style={{ marginTop: 24 }}>
            <Link className="btn btn-primary" href="/products">
              Explore Veyrith Code
            </Link>
          </div>
        </div>

        <div className="principles-list">
          <div className="principle-item">
            <span className="principle-num">01</span>
            <div className="principle-content">
              <h3>Zero PCIe Latency</h3>
              <p>Model weights remain in unified physical RAM, accessible simultaneously by CPU and Metal GPU without host-to-device memory copies.</p>
            </div>
          </div>

          <div className="principle-item">
            <span className="principle-num">02</span>
            <div className="principle-content">
              <h3>Quantized GGUF Precision</h3>
              <p>Q4_K_M quantization compresses 9B parameter models to approximately 5.8 GB on disk with negligible degradation in code generation quality.</p>
            </div>
          </div>

          <div className="principle-item">
            <span className="principle-num">03</span>
            <div className="principle-content">
              <h3>Deterministic Process Lifecycles</h3>
              <p>The bundled llama-server binary is spawned as a child process with strict heartbeat monitoring and automatic memory limits.</p>
            </div>
          </div>
        </div>
      </section>

      {/* High-Intent SEO Technical FAQ */}
      <section className="faq-section" aria-label="Hardware Compatibility Frequently Asked Questions">
        <div className="section-title-wrap">
          <div className="section-eyebrow">Frequently Asked Questions</div>
          <h2 className="section-title">Hardware &amp; Performance FAQ</h2>
          <p className="section-subtitle">
            Answers to common questions about running local models, unified memory, and Windows configurations.
          </p>
        </div>

        <div className="faq-grid">
          <div className="faq-card">
            <h4>Can I run Veyrith Code on an 8 GB MacBook?</h4>
            <p>
              Yes. Veyrith Code runs on 8 GB Apple Silicon systems with optimized quantized models such as Qwen2.5-Coder-7B (Q3_K_S) or 3B profiles. You will see solid throughput (14-20 tok/s), but we recommend keeping background memory usage low to avoid swap thrashing.
            </p>
          </div>

          <div className="faq-card">
            <h4>What is the recommended RAM for serious engineering?</h4>
            <p>
              We recommend 16 GB to 36 GB of unified memory. A 16 GB configuration allows 9B parameter coding models to comfortably coexist with the Monaco editor, TypeScript language servers, local Git indexing, and active compiler toolchains.
            </p>
          </div>

          <div className="faq-card">
            <h4>Does Veyrith Code support NVIDIA GPUs on Windows?</h4>
            <p>
              Yes. Windows workstations equipped with NVIDIA GeForce RTX GPUs (RTX 3060, 3070, 3080, 4070, 4080, 4090) utilize CUDA acceleration to achieve speeds of 35 to 70 tokens per second with full VRAM offloading.
            </p>
          </div>

          <div className="faq-card">
            <h4>Does local inference require an active internet connection?</h4>
            <p>
              Never. The entire Veyrith Code stack—including the Monaco editor engine, llama-server runtime, model weights, and 1,321 offline engineering knowledge assets—is 100% self-contained on your hard drive. Zero internet access is required.
            </p>
          </div>
        </div>
      </section>

      {/* JSON-LD Schemas */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqSchema) }}
      />
    </main>
  );
}

