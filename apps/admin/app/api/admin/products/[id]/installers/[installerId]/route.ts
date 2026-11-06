import { NextResponse } from "next/server";
import { getSupabaseAdmin, writeAuditLog } from "@veyrith/core";
import { getAdministratorId } from "@veyrith/core/admin-session";
import { removeStoredObject } from "@veyrith/core/storage";

type Props = { params: Promise<{ id: string; installerId: string }> };

async function authorize(request: Request) {
  const administratorId = await getAdministratorId(request);
  if (!administratorId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
    return { error: NextResponse.json({ error: "Invalid request origin" }, { status: 403 }) };
  }
  return { administratorId };
}

export async function PATCH(request: Request, { params }: Props) {
  const auth = await authorize(request);
  if ("error" in auth) return auth.error;
  const { id, installerId } = await params;
  const supabase = getSupabaseAdmin();
  const { data: installer, error: installerError } = await supabase.from("ProductInstaller")
    .select("*").eq("id", installerId).maybeSingle();
  if (installerError) throw new Error(`Could not load installer: ${installerError.message}`);
  if (!installer) return NextResponse.json({ error: "Installer not found" }, { status: 404 });
  const { data: version, error: versionError } = await supabase.from("ProductVersion")
    .select("productId,releasedAt").eq("id", installer.versionId).maybeSingle();
  if (versionError) throw new Error(`Could not load installer version: ${versionError.message}`);
  if (!version || version.productId !== id) return NextResponse.json({ error: "Installer not found" }, { status: 404 });
  const { error: publishVersionError } = await supabase.from("ProductVersion")
    .update({ isPublished: true, releasedAt: version.releasedAt ?? new Date().toISOString() })
    .eq("id", installer.versionId);
  if (publishVersionError) throw new Error(`Could not publish installer version: ${publishVersionError.message}`);
  const { data: updated, error } = await supabase.from("ProductInstaller")
    .update({ isPublished: true, updatedAt: new Date().toISOString() })
    .eq("id", installer.id).select("*").single();
  if (error) throw new Error(`Could not publish installer: ${error.message}`);
  await writeAuditLog({
    administratorId: auth.administratorId,
    action: "installer.published",
    entityType: "ProductInstaller",
    entityId: installer.id,
  });
  return NextResponse.json(updated);
}

export async function DELETE(request: Request, { params }: Props) {
  const auth = await authorize(request);
  if ("error" in auth) return auth.error;
  const { id, installerId } = await params;
  const supabase = getSupabaseAdmin();
  const { data: installer, error: installerError } = await supabase.from("ProductInstaller")
    .select("id,storagePath,versionId").eq("id", installerId).maybeSingle();
  if (installerError) throw new Error(`Could not load installer: ${installerError.message}`);
  if (!installer) return NextResponse.json({ error: "Installer not found" }, { status: 404 });
  const { data: version, error: versionError } = await supabase.from("ProductVersion")
    .select("productId").eq("id", installer.versionId).maybeSingle();
  if (versionError) throw new Error(`Could not load installer version: ${versionError.message}`);
  if (!version || version.productId !== id) return NextResponse.json({ error: "Installer not found" }, { status: 404 });
  const { error: deleteError } = await supabase.from("ProductInstaller").delete().eq("id", installer.id);
  if (deleteError) throw new Error(`Could not delete installer: ${deleteError.message}`);
  await writeAuditLog({
    administratorId: auth.administratorId,
    action: "installer.deleted",
    entityType: "ProductInstaller",
    entityId: installer.id,
  });
  await removeStoredObject("product-installers", installer.storagePath);
  const { count, error: countError } = await supabase.from("ProductInstaller")
    .select("id", { count: "exact", head: true }).eq("versionId", installer.versionId);
  if (countError) throw new Error(`Could not check remaining installers: ${countError.message}`);
  if (count === 0) {
    const { error } = await supabase.from("ProductVersion").update({ isPublished: false }).eq("id", installer.versionId);
    if (error) throw new Error(`Could not unpublish empty release: ${error.message}`);
  }
  return new NextResponse(null, { status: 204 });
}
