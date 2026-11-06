import type { Metadata } from "next";
import Link from "next/link";
import { getSupabaseAdmin } from "@veyrith/core";
import { TiltCard } from "../components/tilt-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Veyrith Code & Software Releases — Local AI IDE",
  description: "Download Veyrith Code: local-first, AI-native desktop coding environment with bundled llama.cpp runtime and Metal acceleration.",
  alternates: { canonical: "/products" },
};

type ProductItem = {
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

export default async function ProductsPage() {
  let products: ProductItem[] = [];

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("Product")
      .select("id,name,slug,shortDescription,description,priceMinor,currency,status,features,releaseVersion")
      .eq("isPublished", true)
      .in("status", ["AVAILABLE", "BETA", "COMING_SOON"])
      .order("publishedAt", { ascending: false });

    if (!error && data) {
      products = data as ProductItem[];
    }
  } catch {
    products = [];
  }

  return (
    <main>
      <section className="page-hero">
        <div className="badge">
          <span className="badge-pulse" />
          <span>Software Catalogue &bull; Supabase Live</span>
        </div>
        <h1>Veyrith Code &amp; Software Runtimes</h1>
        <p>
          Local-first, AI-native desktop software and runtimes engineered for total privacy. Your code, your machine, your intelligence.
        </p>
        <div style={{ marginTop: 20 }}>
          <Link className="btn btn-secondary" href="/compatibility" style={{ fontSize: 13, padding: "8px 16px" }}>
            Unsure about performance? Check Your Hardware Compatibility
          </Link>
        </div>
      </section>

      {products.length === 0 ? (
        <section style={{ margin: "32px 0 60px" }}>
          <div className="product-deep-card" style={{ maxWidth: 640, textAlign: "center", padding: "48px 36px" }}>
            <div className="section-eyebrow" style={{ marginBottom: 10 }}>Database Synced</div>
            <h3 style={{ margin: "0 0 10px" }}>Product catalogue is live via Supabase</h3>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-muted)", margin: "0 0 24px" }}>
              Products are dynamically fetched from the database. Add product entries via the admin panel to populate this catalogue.
            </p>
            <Link className="btn btn-primary" href="/contact">
              Contact Engineering
            </Link>
          </div>
        </section>
      ) : (
        <section className="products-detailed-grid" style={{ margin: "20px 0 60px" }} aria-label="Published products">
          {products.map((product) => {
            const displayPrice = product.priceMinor === 0
              ? "Free Developer Preview"
              : new Intl.NumberFormat("en-IN", { style: "currency", currency: product.currency }).format(product.priceMinor / 100);

            return (
              <TiltCard key={product.slug}>
                <article className="product-deep-card" style={{ height: "100%" }}>
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
                      {product.features.slice(0, 4).map((feature, idx) => (
                        <li key={idx}>
                          <span className="feature-bullet">[+]</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div style={{ marginTop: "auto", paddingTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--accent-light)", fontWeight: 600 }}>
                      {displayPrice}
                    </span>
                    <Link className="btn btn-primary" href={`/products/${product.slug}`} style={{ fontSize: 13, padding: "8px 16px" }}>
                      Inspect Specs
                    </Link>
                  </div>
                </article>
              </TiltCard>
            );
          })}
        </section>
      )}
    </main>
  );
}
