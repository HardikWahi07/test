import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin, PublicationStatus, isUniqueViolation, writeAuditLog } from "@veyrith/core";
import { z } from "zod";
import { getAdministratorId } from "@veyrith/core/admin-session";

const articleInput = z.object({
  title: z.string().trim().min(1).max(180),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  excerpt: z.string().trim().max(500).optional(),
  content: z.string().trim().min(1).max(100_000),
  category: z.string().trim().max(100).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  status: z.nativeEnum(PublicationStatus).default("DRAFT"),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(170).optional(),
  canonicalUrl: z.string().url().refine((value) => /^https?:/.test(value)).optional(),
  openGraphImageId: z.string().optional(),
  robotsIndex: z.boolean().default(true),
});

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function GET(request: Request) {
  const administratorId = await getAdministratorId(request);
  if (!administratorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await getSupabaseAdmin().from("BlogPost").select("*").order("updatedAt", { ascending: false });
  if (error) throw new Error(`Could not load articles: ${error.message}`);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const administratorId = await getAdministratorId(request);
  if (!administratorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const parsed = articleInput.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid article details", details: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;
  const supabase = getSupabaseAdmin();
  const categorySlug = input.category ? slugify(input.category) : null;
  let categoryId: string | null = null;
  if (input.category && categorySlug) {
    const { data: category, error: categoryError } = await supabase.from("BlogCategory")
      .upsert({ id: `c${randomUUID().replaceAll("-", "").slice(0, 24)}`, name: input.category, slug: categorySlug }, { onConflict: "slug" })
      .select("id")
      .single();
    if (categoryError) throw new Error(`Could not save article category: ${categoryError.message}`);
    categoryId = category.id;
  }
  const tags = await Promise.all(input.tags.map(async (name) => {
    const { data, error } = await supabase.from("BlogTag")
      .upsert({ id: `c${randomUUID().replaceAll("-", "").slice(0, 24)}`, name, slug: slugify(name) }, { onConflict: "slug" })
      .select("id")
      .single();
    if (error) throw new Error(`Could not save article tag: ${error.message}`);
    return data.id;
  }));
  const { data: post, error } = await supabase.from("BlogPost")
    .insert({
      id: `c${randomUUID().replaceAll("-", "").slice(0, 24)}`,
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt ?? null,
      content: input.content,
      status: input.status,
      categoryId,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      canonicalUrl: input.canonicalUrl ?? null,
      openGraphImageId: input.openGraphImageId ?? null,
      robotsIndex: input.robotsIndex,
      publishedAt: input.status === "PUBLISHED" ? new Date().toISOString() : null,
    })
    .select("*")
    .single();
  if (isUniqueViolation(error)) return NextResponse.json({ error: "An article with that slug already exists." }, { status: 409 });
  if (error) throw new Error(`Could not create article: ${error.message}`);
  if (tags.length) {
    const { error: tagsError } = await supabase.from("_BlogPostToBlogTag")
      .insert(tags.map((tagId) => ({ A: post.id, B: tagId })));
    if (tagsError) throw new Error(`Could not link article tags: ${tagsError.message}`);
  }
  await writeAuditLog({ administratorId, action: "article.created", entityType: "BlogPost", entityId: post.id });
  return NextResponse.json(post, { status: 201 });
}
