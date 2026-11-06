import type { Metadata } from "next";
import Link from "next/link";
import { getSupabaseAdmin } from "@veyrith/core";
import { TiltCard } from "../components/tilt-card";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Research & Evaluations — Veyrith Labs",
  description: "Systems research, model evaluations, and benchmark records from Veyrith Labs.",
  alternates: { canonical: "/research" },
};

export default async function ResearchPage() {
  let posts: Array<{
    title: string;
    slug: string;
    excerpt: string | null;
    publishedAt: string | null;
  }> = [];

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("BlogPost")
      .select("title,slug,excerpt,publishedAt")
      .eq("status", "PUBLISHED")
      .order("publishedAt", { ascending: false });

    if (!error && data) {
      posts = data;
    }
  } catch {
    posts = [];
  }

  return (
    <main>
      <section className="page-hero">
        <div className="badge">
          <span className="badge-pulse" />
          <span>Research &amp; Evaluations</span>
        </div>
        <h1>Model Benchmarks &amp; Systems Research</h1>
        <p>
          Empirical evaluation records, memory measurements, and qualification manifests from the Veyrith Code laboratory.
        </p>
      </section>

      {posts.length === 0 ? (
        <section className="grid-cards" style={{ marginTop: 24 }}>
          <TiltCard className="feature-card-tilt">
            <div className="feature-card-inner">
              <span className="card-num">REPORT / 01</span>
              <h2 className="card-title">
                Model Evaluation &amp; Task Reliability
              </h2>
              <p className="card-desc">
                Independent task verifier records measuring autonomous bug fixes, reproduction suites, and code modification fidelity across quantized Qwen and custom fine-tuned baselines.
              </p>
              <div style={{ marginTop: 20 }}>
                <Link className="btn btn-secondary" href="/about">
                  Read Evaluation Framework
                </Link>
              </div>
            </div>
          </TiltCard>

          <TiltCard className="feature-card-tilt">
            <div className="feature-card-inner">
              <span className="card-num">REPORT / 02</span>
              <h2 className="card-title">
                Workload Memory &amp; Metal RSS Profiling
              </h2>
              <p className="card-desc">
                In-depth profiling of resident set size (RSS) memory consumption under constrained context windows on Apple Silicon Metal compute vs unified CPU memory buffers.
              </p>
              <div style={{ marginTop: 20 }}>
                <Link className="btn btn-secondary" href="/about">
                  View Memory Benchmarks
                </Link>
              </div>
            </div>
          </TiltCard>

          <TiltCard className="feature-card-tilt">
            <div className="feature-card-inner">
              <span className="card-num">REPORT / 03</span>
              <h2 className="card-title">
                Offline Engineering Library Provenance
              </h2>
              <p className="card-desc">
                Documentation of the 1,321-file curated engineering library ingested from 21 pinned repositories, including deduplication gates, license snapshots, and secret screening audits.
              </p>
              <div style={{ marginTop: 20 }}>
                <Link className="btn btn-secondary" href="/about">
                  Inspect Asset Ingestion
                </Link>
              </div>
            </div>
          </TiltCard>
        </section>
      ) : (
        <section className="grid-cards" aria-label="Published articles">
          {posts.map((post, idx) => (
            <TiltCard key={post.slug}>
              <article className="feature-card-inner">
                <span className="card-num">REPORT / {String(idx + 1).padStart(2, "0")}</span>
                <h2 className="card-title">
                  <Link href={`/research/${post.slug}`}>{post.title}</Link>
                  <span className="card-arrow" aria-hidden="true">&rarr;</span>
                </h2>
                <p className="card-desc">{post.excerpt}</p>
              </article>
            </TiltCard>
          ))}
        </section>
      )}
    </main>
  );
}
