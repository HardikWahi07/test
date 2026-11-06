import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@veyrith/core";
import { createMediaUrl } from "@veyrith/core/storage";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data: media, error: mediaError } = await supabase.from("MediaAsset").select("id,storagePath").eq("id", id).maybeSingle();
  if (mediaError) throw new Error(`Could not load media asset: ${mediaError.message}`);
  if (!media) return NextResponse.json({ error: "Media not found" }, { status: 404 });
  const [images, products, pages, posts] = await Promise.all([
    supabase.from("ProductImage").select("productId").eq("mediaAssetId", id),
    supabase.from("Product").select("id").or(`logoMediaAssetId.eq.${id},openGraphImageId.eq.${id}`).eq("isPublished", true),
    supabase.from("Page").select("id").eq("openGraphImageId", id).eq("status", "PUBLISHED").eq("robotsIndex", true),
    supabase.from("BlogPost").select("id").eq("openGraphImageId", id).eq("status", "PUBLISHED").eq("robotsIndex", true),
  ]);
  if (images.error || products.error || pages.error || posts.error) {
    throw new Error(`Could not verify media visibility: ${images.error?.message ?? products.error?.message ?? pages.error?.message ?? posts.error?.message}`);
  }
  const imageProductIds = (images.data ?? []).map((image) => image.productId);
  const { data: imageProducts, error: imageProductsError } = imageProductIds.length
    ? await supabase.from("Product").select("id").in("id", imageProductIds).eq("isPublished", true)
    : { data: [], error: null };
  if (imageProductsError) throw new Error(`Could not verify product image visibility: ${imageProductsError.message}`);
  if (!products.data?.length && !pages.data?.length && !posts.data?.length && !imageProducts?.length) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }
  const url = await createMediaUrl(media.storagePath);
  return NextResponse.redirect(url, { status: 302, headers: { "cache-control": "public, max-age=60" } });
}
