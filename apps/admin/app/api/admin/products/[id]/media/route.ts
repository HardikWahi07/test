import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin, writeAuditLog } from "@veyrith/core";
import { getAdministratorId } from "@veyrith/core/admin-session";
import { removeStoredObject, uploadStoredObject } from "@veyrith/core/storage";

type Props = { params: Promise<{ id: string }> };
const mediaInput = z.object({
  kind: z.enum(["logo", "screenshot"]),
  altText: z.string().trim().min(1).max(250),
});
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function POST(request: Request, { params }: Props) {
  const administratorId = await getAdministratorId(request);
  if (!administratorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const form = await request.formData();
  const parsed = mediaInput.safeParse({ kind: form.get("kind"), altText: form.get("altText") });
  const file = form.get("file");
  if (!parsed.success || !(file instanceof File) || file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Provide an image and alt text. Maximum image size is 20 MiB." }, { status: 400 });
  }
  const extension = allowedTypes.get(file.type);
  if (!extension) return NextResponse.json({ error: "Only JPEG, PNG, and WebP images are supported." }, { status: 400 });
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const validSignature =
    (extension === "jpg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
    (extension === "png" && bytes.slice(0, 8).join(",") === [137, 80, 78, 71, 13, 10, 26, 10].join(",")) ||
    (extension === "webp" && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP");
  if (!validSignature) return NextResponse.json({ error: "Image file signature does not match its format." }, { status: 400 });
  const { id: productId } = await params;
  const { data: product, error: productError } = await getSupabaseAdmin().from("Product")
    .select("id").eq("id", productId).maybeSingle();
  if (productError) throw new Error(`Could not load product: ${productError.message}`);
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const storagePath = `${productId}/${randomUUID()}.${extension}`;
  await uploadStoredObject({ bucket: "public-media", storagePath, file, contentType: file.type });
  const supabase = getSupabaseAdmin();
  let mediaId: string | undefined;
  try {
    const { data: media, error: mediaError } = await supabase.from("MediaAsset").insert({
      id: `c${randomUUID().replaceAll("-", "").slice(0, 24)}`,
      storagePath,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      altText: parsed.data.altText,
    }).select("*").single();
    if (mediaError) throw new Error(`Could not save uploaded media: ${mediaError.message}`);
    mediaId = media.id;
    if (parsed.data.kind === "logo") {
      const { error } = await supabase.from("Product").update({ logoMediaAssetId: media.id }).eq("id", productId);
      if (error) throw new Error(`Could not attach product logo: ${error.message}`);
    } else {
      const { error } = await supabase.from("ProductImage").insert({
        id: `c${randomUUID().replaceAll("-", "").slice(0, 24)}`,
        productId,
        mediaAssetId: media.id,
        altText: parsed.data.altText,
        sortOrder: 0,
      });
      if (error) throw new Error(`Could not attach product image: ${error.message}`);
    }
    await writeAuditLog({ administratorId, action: "product.media.uploaded", entityType: "MediaAsset", entityId: media.id });
    return NextResponse.json(media, { status: 201 });
  } catch (error) {
    if (mediaId) {
      const { error: cleanupError } = await supabase.from("MediaAsset").delete().eq("id", mediaId);
      if (cleanupError) console.error("Could not remove media metadata after failed upload.", cleanupError);
    }
    await removeStoredObject("public-media", storagePath);
    throw error;
  }
}
