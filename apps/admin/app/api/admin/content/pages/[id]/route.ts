import { NextResponse } from "next/server";
import { getSupabaseAdmin, PublicationStatus, writeAuditLog } from "@veyrith/core";
import { z } from "zod";
import { getAdministratorId } from "@veyrith/core/admin-session";

const updates = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120).optional(),
  content: z.string().trim().min(1).max(50_000).optional(),
  status: z.nativeEnum(PublicationStatus).optional(),
  seoTitle: z.string().trim().max(70).nullable().optional(),
  seoDescription: z.string().trim().max(170).nullable().optional(),
  canonicalUrl: z.string().url().refine((value) => /^https?:/.test(value)).nullable().optional(),
  openGraphImageId: z.string().nullable().optional(),
  robotsIndex: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const administratorId = await getAdministratorId(request);
  if (!administratorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const parsed = updates.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid page updates", details: parsed.error.flatten() }, { status: 400 });
  const { id } = await params;
  const { data: current, error: currentError } = await getSupabaseAdmin().from("Page")
    .select("*").eq("id", id).maybeSingle();
  if (currentError) throw new Error(`Could not load page: ${currentError.message}`);
  if (!current) return NextResponse.json({ error: "Page not found" }, { status: 404 });
  const status = parsed.data.status ?? current.status;
  const { data: page, error } = await getSupabaseAdmin().from("Page")
    .update({
      ...parsed.data,
      status,
      publishedAt: status === "PUBLISHED" ? current.publishedAt ?? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(`Could not update page: ${error.message}`);
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });
  await writeAuditLog({ administratorId, action: "page.updated", entityType: "Page", entityId: id });
  return NextResponse.json(page);
}
