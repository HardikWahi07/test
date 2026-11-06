import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin, isUniqueViolation, writeAuditLog } from "@veyrith/core";
import { z } from "zod";
import { getAdministratorId } from "@veyrith/core/admin-session";

const productInput = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  shortDescription: z.string().trim().min(1).max(240),
  description: z.string().trim().min(1).max(20_000),
  category: z.string().trim().min(1).max(80),
  priceMinor: z.number().int().min(0).max(2_000_000_000),
  features: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
  status: z.enum(["DRAFT", "COMING_SOON", "BETA", "AVAILABLE", "DISCONTINUED", "ARCHIVED"]).default("DRAFT"),
  releaseVersion: z.string().trim().max(40).optional(),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(170).optional(),
});

export async function GET(request: Request) {
  const administratorId = await getAdministratorId(request);
  if (!administratorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const [{ data: products, error: productsError }, { data: categories, error: categoriesError }] = await Promise.all([
    supabase.from("Product").select("*").order("updatedAt", { ascending: false }),
    supabase.from("ProductCategory").select("*"),
  ]);
  if (productsError) throw new Error(`Could not load products: ${productsError.message}`);
  if (categoriesError) throw new Error(`Could not load product categories: ${categoriesError.message}`);
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  return NextResponse.json(products.map((product) => ({ ...product, category: categoriesById.get(product.categoryId) ?? null })));
}

export async function POST(request: Request) {
  const administratorId = await getAdministratorId(request);
  if (!administratorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const parsed = productInput.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid product data", details: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  const categorySlug = input.category.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const { data: category, error: categoryError } = await getSupabaseAdmin().from("ProductCategory")
    .upsert({ id: `c${randomUUID().replaceAll("-", "").slice(0, 24)}`, name: input.category, slug: categorySlug }, { onConflict: "slug" })
    .select("id")
    .single();
  if (categoryError) throw new Error(`Could not save product category: ${categoryError.message}`);
  const { data: product, error } = await getSupabaseAdmin().from("Product").insert({
    id: `c${randomUUID().replaceAll("-", "").slice(0, 24)}`,
    name: input.name,
    slug: input.slug,
    shortDescription: input.shortDescription,
    description: input.description,
    categoryId: category.id,
    priceMinor: input.priceMinor,
    features: input.features,
    status: input.status,
    releaseVersion: input.releaseVersion ?? null,
    seoTitle: input.seoTitle ?? null,
    seoDescription: input.seoDescription ?? null,
    isPublished: false,
  }).select("*").single();
  if (isUniqueViolation(error)) return NextResponse.json({ error: "A product with that slug already exists." }, { status: 409 });
  if (error) throw new Error(`Could not create product: ${error.message}`);
  await writeAuditLog({ administratorId, action: "product.created", entityType: "Product", entityId: product.id });
  return NextResponse.json(product, { status: 201 });
}
