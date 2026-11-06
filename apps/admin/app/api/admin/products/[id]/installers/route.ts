import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin, type ProductInstaller, writeAuditLog } from "@veyrith/core";
import { getAdministratorId } from "@veyrith/core/admin-session";
import { removeStoredObject, uploadStoredObject } from "@veyrith/core/storage";

type Props = { params: Promise<{ id: string }> };
const installerInput = z.object({
  version: z.string().trim().min(1).max(40),
  platform: z.enum(["MACOS", "WINDOWS"]),
  releaseNotes: z.string().trim().max(20_000).optional(),
  minimumOsVersion: z.string().trim().max(80).optional(),
});
const MAX_FILE_BYTES = 1_073_741_824;

function isAllowedInstaller(fileName: string, bytes: Uint8Array) {
  const extension = fileName.toLowerCase().split(".").pop();
  if (extension === "exe") return bytes[0] === 0x4d && bytes[1] === 0x5a;
  if (extension === "msi") {
    return bytes.slice(0, 8).join(",") === [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].join(",");
  }
  if (extension === "pkg") {
    return new TextDecoder().decode(bytes.slice(0, 4)) === "xar!";
  }
  if (extension === "dmg") {
    return new TextDecoder().decode(bytes.slice(512, 516)) === "koly";
  }
  return false;
}

export async function POST(request: Request, { params }: Props) {
  const administratorId = await getAdministratorId(request);
  if (!administratorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const form = await request.formData();
  const parsed = installerInput.safeParse({
    version: form.get("version"),
    platform: form.get("platform"),
    releaseNotes: form.get("releaseNotes") || undefined,
    minimumOsVersion: form.get("minimumOsVersion") || undefined,
  });
  const file = form.get("file");
  if (!parsed.success || !(file instanceof File) || file.size === 0 || file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Provide a valid installer and release details. Maximum file size is 1 GiB." }, { status: 400 });
  }
  const originalName = file.name.replace(/\\/g, "/").split("/").pop() ?? "";
  const extension = originalName.toLowerCase().split(".").pop();
  const allowedExtension =
    parsed.data.platform === "MACOS" ? ["dmg", "pkg"].includes(extension ?? "") : ["exe", "msi"].includes(extension ?? "");
  const bytes = new Uint8Array(await file.slice(0, 520).arrayBuffer());
  if (!allowedExtension || !isAllowedInstaller(originalName, bytes)) {
    return NextResponse.json({ error: "The file extension, platform, or installer signature is not valid." }, { status: 400 });
  }
  const { id: productId } = await params;
  const supabase = getSupabaseAdmin();
  const { data: product, error: productError } = await supabase.from("Product").select("id").eq("id", productId).maybeSingle();
  if (productError) throw new Error(`Could not load product: ${productError.message}`);
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const { data: version, error: versionError } = await supabase.from("ProductVersion")
    .upsert({
      id: `c${randomUUID().replaceAll("-", "").slice(0, 24)}`,
      productId,
      version: parsed.data.version,
      releaseNotes: parsed.data.releaseNotes ?? null,
    }, { onConflict: "productId,version" })
    .select("*")
    .single();
  if (versionError) throw new Error(`Could not save product version: ${versionError.message}`);
  const storagePath = `${productId}/${version.id}/${parsed.data.platform.toLowerCase()}/${randomUUID()}.${extension}`;
  const mimeType = parsed.data.platform === "MACOS"
    ? extension === "dmg" ? "application/x-apple-diskimage" : "application/x-pkg"
    : extension === "msi" ? "application/x-msi" : "application/vnd.microsoft.portable-executable";
  const { data: prior, error: priorError } = await supabase.from("ProductInstaller")
    .select("id,storagePath")
    .eq("versionId", version.id)
    .eq("platform", parsed.data.platform)
    .maybeSingle();
  if (priorError) throw new Error(`Could not load existing installer: ${priorError.message}`);
  await uploadStoredObject({ bucket: "product-installers", storagePath, file, contentType: mimeType });
  let installer: ProductInstaller;
  let saved = false;
  try {
    const write = prior
      ? supabase.from("ProductInstaller").update({
          fileName: originalName,
          storagePath,
          fileSize: file.size,
          mimeType,
          minimumOsVersion: parsed.data.minimumOsVersion ?? null,
          isPublished: false,
          updatedAt: new Date().toISOString(),
        }).eq("id", prior.id)
      : supabase.from("ProductInstaller").insert({
          id: `c${randomUUID().replaceAll("-", "").slice(0, 24)}`,
          versionId: version.id,
          platform: parsed.data.platform,
          fileName: originalName,
          storagePath,
          fileSize: file.size,
          mimeType,
          minimumOsVersion: parsed.data.minimumOsVersion ?? null,
          isPublished: false,
        });
    const { data, error } = await write.select("*").single();
    if (error) throw new Error(`Could not save installer: ${error.message}`);
    installer = data;
    saved = true;
    await writeAuditLog({
      administratorId,
      action: "installer.uploaded",
      entityType: "ProductInstaller",
      entityId: installer.id,
      details: { productId, version: parsed.data.version, platform: installer.platform },
    });
  } catch (error) {
    if (!saved) await removeStoredObject("product-installers", storagePath);
    throw error;
  }
  if (prior) await removeStoredObject("product-installers", prior.storagePath);
  return NextResponse.json(installer, { status: prior ? 200 : 201 });
}
