import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin, PublicationStatus, isUniqueViolation, writeAuditLog } from "@veyrith/core";
import { z } from "zod";
import { getAdministratorId } from "@veyrith/core/admin-session";

const pageInput = z.object({
  title: z.string().trim().min(1).max(160),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  content: z.string().trim().min(1).max(50_000),
  status: z.nativeEnum(PublicationStatus).default("DRAFT"),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(170).optional(),
  canonicalUrl: z.string().url().refine((value) => /^https?:/.test(value)).optional(),
  openGraphImageId: z.string().optional(),
  robotsIndex: z.boolean().default(true),
});

export async function GET(request: Request) {
  const administratorId = await getAdministratorId(request);
  if (!administratorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await getSupabaseAdmin().from("Page").select("*").order("updatedAt", { ascending: false });
  if (error) throw new Error(`Could not load pages: ${error.message}`);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const administratorId = await getAdministratorId(request);
  if (!administratorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const parsed = pageInput.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid page details", details: parsed.error.flatten() }, { status: 400 });
  const { data: page, error } = await getSupabaseAdmin().from("Page")
    .insert({
      id: `c${randomUUID().replaceAll("-", "").slice(0, 24)}`,
      ...parsed.data,
      publishedAt: parsed.data.status === "PUBLISHED" ? new Date().toISOString() : null,
    })
    .select("*")
    .single();
  if (isUniqueViolation(error)) return NextResponse.json({ error: "A page with that slug already exists." }, { status: 409 });
  if (error) throw new Error(`Could not create page: ${error.message}`);
  await writeAuditLog({ administratorId, action: "page.created", entityType: "Page", entityId: page.id });
  return NextResponse.json(page, { status: 201 });
}
