import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("Connecting to Supabase at:", url);

  // 1. Ensure Categories
  const categories = [
    { name: "Desktop IDE", slug: "desktop-ide" },
    { name: "Inference Engine", slug: "inference-engine" },
    { name: "Knowledge Assets", slug: "knowledge-assets" },
  ];

  const categoryMap = new Map();

  for (const cat of categories) {
    const { data: existing } = await supabase
      .from("ProductCategory")
      .select("id,slug")
      .eq("slug", cat.slug)
      .maybeSingle();

    if (existing) {
      categoryMap.set(cat.slug, existing.id);
      console.log(`Found category: ${cat.name} (${existing.id})`);
    } else {
      const newId = `cat_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
      const { data, error } = await supabase
        .from("ProductCategory")
        .insert({ id: newId, name: cat.name, slug: cat.slug })
        .select("id")
        .single();

      if (error) {
        console.error(`Failed to create category ${cat.name}:`, error.message);
      } else {
        categoryMap.set(cat.slug, data.id);
        console.log(`Created category: ${cat.name} (${data.id})`);
      }
    }
  }

  // 2. Products to upsert
  const products = [
    {
      name: "Veyrith Code Desktop",
      slug: "veyrith-code-desktop",
      categorySlug: "desktop-ide",
      shortDescription: "Local-first, AI-native desktop IDE powered by bundled llama.cpp runtime with Apple Silicon Metal acceleration.",
      description: "Veyrith Code is a local-first, AI-native desktop coding environment built with Electron, React, and Monaco editor. It bundles an optimized local llama.cpp runtime with native Apple Silicon Metal GPU acceleration, ensuring 100% private, offline code editing, semantic indexing, and autonomous agent loops without any remote server round-trips.",
      priceMinor: 0,
      currency: "INR",
      status: "AVAILABLE",
      isPublished: true,
      publishedAt: new Date().toISOString(),
      releaseVersion: "1.0.0-preview",
      features: [
        "Bundled llama.cpp runtime with native Apple Silicon Metal GPU acceleration",
        "Offline Monaco code editor with full LSP and AST syntax trees",
        "Deterministic local coding agent with strict user permission checkpoints",
        "1,321 qualified reference assets for offline engineering knowledge",
        "100% private: zero telemetry, zero code uploaded to cloud",
        "Multi-tab workspace management rooted under ~/Veyrith Projects",
        "Interactive Git diff inspection and status panel"
      ],
      seoTitle: "Veyrith Code Desktop — Local AI-Native IDE",
      seoDescription: "Download Veyrith Code Desktop. A local-first, AI-native IDE with bundled llama.cpp runtime and Metal acceleration.",
    },
    {
      name: "Veyrith Local Model Runtime",
      slug: "veyrith-local-model-runtime",
      categorySlug: "inference-engine",
      shortDescription: "Self-contained llama-server and llama-cli binaries with custom IPC adapters for Electron.",
      description: "A reproducible, pinned C++ inference engine packaging llama-server and llama-cli binaries with custom IPC adapters. Engineered for low-jitter token streaming on Apple Silicon (Metal) and x86_64 (AVX2), featuring automated subprocess lifecycle management, context window controls, and local task completion harnesses.",
      priceMinor: 0,
      currency: "INR",
      status: "BETA",
      isPublished: true,
      publishedAt: new Date().toISOString(),
      releaseVersion: "b2930-metal",
      features: [
        "Native llama.cpp engine with Q4_K_M quantization support",
        "Process watchdog with automatic crash recovery and heartbeat monitoring",
        "Zero external API dependencies or cloud rate limits",
        "Low-jitter token streaming directly into Monaco editor buffers",
        "Reproducible build tree with pinned compiler flags"
      ],
      seoTitle: "Veyrith Local Model Runtime — llama.cpp Metal Engine",
      seoDescription: "Pinned local llama.cpp inference engine bundled for Veyrith Code desktop application.",
    },
    {
      name: "Veyrith Offline Knowledge Pack",
      slug: "veyrith-offline-knowledge-pack",
      categorySlug: "knowledge-assets",
      shortDescription: "Audited engineering knowledge library retrieved directly by the agent during context assembly.",
      description: "Curated collection of 1,321 qualified engineering reference assets sourced from 21 pinned repositories. Packaged into a local JSON manifest with verified software licenses, secret screening, and AST syntax parsing, providing the autonomous agent with authoritative full-stack patterns without cloud vector search.",
      priceMinor: 0,
      currency: "INR",
      status: "AVAILABLE",
      isPublished: true,
      publishedAt: new Date().toISOString(),
      releaseVersion: "2026.1",
      features: [
        "1,321 qualified reference assets from 21 pinned repositories",
        "Verified software license snapshots and strict secret screening",
        "Local JSON manifest: zero cloud vector database queries",
        "Comprehensive coverage across React, Next.js, TypeScript, and Rust",
        "Automatic offline context assembly for agent edit loops"
      ],
      seoTitle: "Veyrith Offline Knowledge Pack — 1,321 Engineering Assets",
      seoDescription: "Local knowledge manifest of 1,321 verified engineering reference assets for Veyrith Code.",
    },
  ];

  for (const prod of products) {
    const categoryId = categoryMap.get(prod.categorySlug);
    if (!categoryId) {
      console.warn(`Category ${prod.categorySlug} not found for product ${prod.slug}`);
      continue;
    }

    const { data: existing } = await supabase
      .from("Product")
      .select("id,slug")
      .eq("slug", prod.slug)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("Product")
        .update({
          name: prod.name,
          shortDescription: prod.shortDescription,
          description: prod.description,
          categoryId,
          priceMinor: prod.priceMinor,
          currency: prod.currency,
          status: prod.status,
          isPublished: prod.isPublished,
          publishedAt: prod.publishedAt,
          releaseVersion: prod.releaseVersion,
          features: prod.features,
          seoTitle: prod.seoTitle,
          seoDescription: prod.seoDescription,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        console.error(`Failed to update ${prod.name}:`, error.message);
      } else {
        console.log(`Updated existing product in Supabase: ${prod.name} (${existing.id})`);
      }
    } else {
      const newId = `prod_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
      const { error } = await supabase.from("Product").insert({
        id: newId,
        name: prod.name,
        slug: prod.slug,
        shortDescription: prod.shortDescription,
        description: prod.description,
        categoryId,
        priceMinor: prod.priceMinor,
        currency: prod.currency,
        status: prod.status,
        isPublished: prod.isPublished,
        publishedAt: prod.publishedAt,
        releaseVersion: prod.releaseVersion,
        features: prod.features,
        seoTitle: prod.seoTitle,
        seoDescription: prod.seoDescription,
        updatedAt: new Date().toISOString(),
      });

      if (error) {
        console.error(`Failed to insert ${prod.name}:`, error.message);
      } else {
        console.log(`Inserted new product into Supabase: ${prod.name} (${newId})`);
      }
    }
  }

  // Count total published products
  const { data: allProds, error: countErr } = await supabase
    .from("Product")
    .select("id,name,slug,status,isPublished");

  if (countErr) {
    console.error("Failed to query count:", countErr.message);
  } else {
    console.log(`Current products in Supabase (${allProds.length}):`);
    allProds.forEach((p) => console.log(` - [${p.status}] ${p.name} (published: ${p.isPublished})`));
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

