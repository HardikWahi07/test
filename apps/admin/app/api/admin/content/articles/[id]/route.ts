import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin, PublicationStatus, isUniqueViolation, writeAuditLog } from "@veyrith/core";
import { z } from "zod";
import { getAdministratorId } from "@veyrith/core/admin-session";

const updates = z.object({
  title: z.string().trim().min(1).max(180).optional(),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120).optional(),
  excerpt: z.string().trim().max(500).nullable().optional(),
  content: z.string().trim().min(1).max(100_000).optional(),
  category: z.string().trim().min(1).max(100).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
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
  if (!parsed.success) return NextResponse.json({ error: "Invalid article updates", details: parsed.error.flatten() }, { status: 400 });
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data: current, error: currentError } = await supabase.from("BlogPost")
    .select("*").eq("id", id).maybeSingle();
  if (currentError) throw new Error(`Could not load article: ${currentError.message}`);
  if (!current) return NextResponse.json({ error: "Article not found" }, { status: 404 });
  const status = parsed.data.status ?? current.status;
  const { category, tags, ...postChanges } = parsed.data;
  let categoryId = current.categoryId;
  if (category !== undefined) {
    categoryId = null;
    if (category !== null) {
      const categorySlug = category.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const { data: categoryRecord, error: categoryError } = await supabase.from("BlogCategory")
        .upsert({ id: `c${randomUUID().replaceAll("-", "").slice(0, 24)}`, name: category, slug: categorySlug }, { onConflict: "slug" })
        .select("id")
        .single();
      if (categoryError) throw new Error(`Could not save article category: ${categoryError.message}`);
      categoryId = categoryRecord.id;
    }
  }
  const tagIds = tags ? await Promise.all(tags.map(async (name) => {
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { data, error } = await supabase.from("BlogTag")
      .upsert({ id: `c${randomUUID().replaceAll("-", "").slice(0, 24)}`, name, slug }, { onConflict: "slug" })
      .select("id")
      .single();
    if (error) throw new Error(`Could not save article tag: ${error.message}`);
    return data.id;
  })) : undefined;
  const { data: updated, error } = await supabase.from("BlogPost").update({
    ...postChanges,
    categoryId,
    status,
    publishedAt: status === "PUBLISHED" ? current.publishedAt ?? new Date().toISOString() : null,
    updatedAt: new Date().toISOString(),
  }).eq("id", id).select("*").maybeSingle();
  if (isUniqueViolation(error)) return NextResponse.json({ error: "An article with that slug already exists." }, { status: 409 });
  if (error) throw new Error(`Could not update article: ${error.message}`);
  if (!updated) return NextResponse.json({ error: "Article not found" }, { status: 404 });
  if (tagIds) {
    const { error: deleteError } = await supabase.from("_BlogPostToBlogTag").delete().eq("A", id);
    if (deleteError) throw new Error(`Could not remove previous article tags: ${deleteError.message}`);
    if (tagIds.length) {
      const { error: insertError } = await supabase.from("_BlogPostToBlogTag")
        .insert(tagIds.map((tagId) => ({ A: id, B: tagId })));
      if (insertError) throw new Error(`Could not link article tags: ${insertError.message}`);
    }
  }
  await writeAuditLog({ administratorId, action: "article.updated", entityType: "BlogPost", entityId: id });
  return NextResponse.json(updated);
}
