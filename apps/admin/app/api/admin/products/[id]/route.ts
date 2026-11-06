import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin, isUniqueViolation, writeAuditLog } from "@veyrith/core";
import { z } from "zod";
import { getAdministratorId } from "@veyrith/core/admin-session";

type Props = { params: Promise<{ id: string }> };
const changes = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120).optional(),
  shortDescription: z.string().trim().min(1).max(240).optional(),
  description: z.string().trim().min(1).max(20_000).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  priceMinor: z.number().int().min(0).max(2_000_000_000).optional(),
  status: z.enum(["DRAFT", "COMING_SOON", "BETA", "AVAILABLE", "DISCONTINUED", "ARCHIVED"]).optional(),
  isPublished: z.boolean().optional(),
  seoTitle: z.string().trim().max(70).nullable().optional(),
  seoDescription: z.string().trim().max(170).nullable().optional(),
  canonicalUrl: z.string().url().refine((value) => /^https?:/.test(value)).nullable().optional(),
  openGraphImageId: z.string().nullable().optional(),
  releaseVersion: z.string().trim().max(40).nullable().optional(),
  releaseNotes: z.string().trim().max(20_000).nullable().optional(),
  systemRequirements: z.string().trim().max(5000).nullable().optional(),
  documentationUrl: z.string().url().refine((value) => /^https?:/.test(value)).nullable().optional(),
  supportInformation: z.string().trim().max(5000).nullable().optional(),
  features: z.array(z.string().trim().min(1).max(200)).max(30).optional(),
});

export async function PATCH(request: Request, { params }: Props) {
  const administratorId = await getAdministratorId(request);
  if (!administratorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const parsed = changes.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid product updates", details: parsed.error.flatten() }, { status: 400 });
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data: current, error: currentError } = await supabase.from("Product").select("*").eq("id", id).maybeSingle();
  if (currentError) throw new Error(`Could not load product: ${currentError.message}`);
  if (!current) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const status = parsed.data.status ?? current.status;
  const isPublished = parsed.data.isPublished ?? current.isPublished;
  if (isPublished && !["AVAILABLE", "BETA", "COMING_SOON"].includes(status)) {
    return NextResponse.json({ error: "Draft, discontinued, and archived products cannot be published." }, { status: 400 });
  }
  if (isPublished && status === "AVAILABLE") {
    const { data: versions, error: versionsError } = await supabase.from("ProductVersion")
      .select("id")
      .eq("productId", id)
      .eq("isPublished", true)
      .order("releasedAt", { ascending: false });
    if (versionsError) throw new Error(`Could not verify published installers: ${versionsError.message}`);
    let hasCompleteRelease = false;
    for (const version of versions) {
      const { data: installers, error: installersError } = await supabase.from("ProductInstaller")
        .select("platform")
        .eq("versionId", version.id)
        .eq("isPublished", true);
      if (installersError) throw new Error(`Could not verify published installers: ${installersError.message}`);
      const platforms = new Set(installers.map((installer) => installer.platform));
      if (platforms.has("MACOS") && platforms.has("WINDOWS")) {
        hasCompleteRelease = true;
        break;
      }
    }
    if (!hasCompleteRelease) {
      return NextResponse.json(
        { error: "Publish a release with published macOS and Windows installers before making this product available." },
        { status: 409 },
      );
    }
  }
  if (status === "ARCHIVED" && isPublished) {
    return NextResponse.json({ error: "Archived products cannot be published." }, { status: 400 });
  }

  const { category, ...productChanges } = parsed.data;
  let categoryId: string | undefined;
  if (category) {
    const categorySlug = category.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { data: categoryRecord, error: categoryError } = await supabase.from("ProductCategory")
      .upsert({ id: `c${randomUUID().replaceAll("-", "").slice(0, 24)}`, name: category, slug: categorySlug }, { onConflict: "slug" })
      .select("id")
      .single();
    if (categoryError) throw new Error(`Could not save product category: ${categoryError.message}`);
    categoryId = categoryRecord.id;
  }
  const nextIsPublished = isPublished && status !== "ARCHIVED" && status !== "DISCONTINUED";
  const { data: product, error } = await supabase.from("Product").update({
    ...productChanges,
    ...(categoryId ? { categoryId } : {}),
    status,
    isPublished: nextIsPublished,
    publishedAt: nextIsPublished ? current.publishedAt ?? new Date().toISOString() : null,
    archivedAt: status === "ARCHIVED" ? current.archivedAt ?? new Date().toISOString() : null,
    updatedAt: new Date().toISOString(),
  }).eq("id", id).select("*").maybeSingle();
  if (isUniqueViolation(error)) return NextResponse.json({ error: "A product with that slug already exists." }, { status: 409 });
  if (error) throw new Error(`Could not update product: ${error.message}`);
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  await writeAuditLog({
    administratorId,
    action: "product.updated",
    entityType: "Product",
    entityId: product.id,
    details: { isPublished: product.isPublished, status: product.status },
  });
  return NextResponse.json(product);
}

export async function DELETE(request: Request, { params }: Props) {
  const administratorId = await getAdministratorId(request);
  if (!administratorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const [ordersResult, entitlementsResult] = await Promise.all([
    supabase.from("OrderItem").select("id", { count: "exact", head: true }).eq("productId", id),
    supabase.from("Entitlement").select("id", { count: "exact", head: true }).eq("productId", id),
  ]);
  if (ordersResult.error) throw new Error(`Could not check product purchase history: ${ordersResult.error.message}`);
  if (entitlementsResult.error) throw new Error(`Could not check product entitlements: ${entitlementsResult.error.message}`);
  if ((ordersResult.count ?? 0) || (entitlementsResult.count ?? 0)) {
    return NextResponse.json(
      { error: "Products with purchase history cannot be deleted. Archive the product instead." },
      { status: 409 },
    );
  }
  const { data: deleted, error } = await supabase.from("Product").delete().eq("id", id).select("id").maybeSingle();
  if (error) throw new Error(`Could not delete product: ${error.message}`);
  if (!deleted) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  await writeAuditLog({ administratorId, action: "product.deleted", entityType: "Product", entityId: deleted.id });
  return new NextResponse(null, { status: 204 });
}
