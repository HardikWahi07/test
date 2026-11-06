import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@veyrith/core";
import { getCustomerId } from "@veyrith/core/admin-session";
import { createInstallerDownloadUrl } from "@veyrith/core/storage";

const querySchema = z.object({
  product: z.string().min(1).max(120),
  platform: z.enum(["MACOS", "WINDOWS"]),
});

export async function GET(request: Request) {
  const customerId = await getCustomerId(request);
  if (!customerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    product: url.searchParams.get("product"),
    platform: url.searchParams.get("platform"),
  });
  if (!parsed.success) return NextResponse.json({ error: "Invalid download request" }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data: product, error: productError } = await supabase
    .from("Product").select("id").eq("slug", parsed.data.product).maybeSingle();
  if (productError) throw new Error(`Could not find download product: ${productError.message}`);
  if (!product) return NextResponse.json({ error: "No active product entitlement" }, { status: 403 });
  const { data: entitlement, error: entitlementError } = await supabase
    .from("Entitlement").select("productId").eq("customerId", customerId).eq("productId", product.id).eq("status", "ACTIVE").maybeSingle();
  if (entitlementError) throw new Error(`Could not verify download entitlement: ${entitlementError.message}`);
  if (!entitlement) return NextResponse.json({ error: "No active product entitlement" }, { status: 403 });

  const { data: versions, error: versionsError } = await supabase
    .from("ProductVersion").select("id").eq("productId", entitlement.productId).eq("isPublished", true).order("releasedAt", { ascending: false }).limit(1);
  if (versionsError) throw new Error(`Could not load published product version: ${versionsError.message}`);
  const { data: installer, error: installerError } = versions?.length
    ? await supabase.from("ProductInstaller").select("*").eq("versionId", versions[0].id).eq("platform", parsed.data.platform).eq("isPublished", true).maybeSingle()
    : { data: null, error: null };
  if (installerError) throw new Error(`Could not load product installer: ${installerError.message}`);
  if (!installer) return NextResponse.json({ error: "No published installer is available for this platform." }, { status: 404 });

  const { error: eventError } = await supabase.from("DownloadEvent").insert({
      id: `c${randomUUID().replaceAll("-", "").slice(0, 24)}`,
      customerId,
      productId: entitlement.productId,
      versionId: installer.versionId,
      installerId: installer.id,
  });
  if (eventError) throw new Error(`Could not record download event: ${eventError.message}`);
  const signedUrl = await createInstallerDownloadUrl(installer.storagePath);
  return NextResponse.redirect(signedUrl, { status: 302 });
}
