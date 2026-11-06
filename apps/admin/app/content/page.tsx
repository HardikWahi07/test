import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@veyrith/core";
import { readSessionToken } from "@veyrith/core/session";
import { ContentManager } from "./content-manager";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const token = (await cookies()).get("veyrith_admin")?.value;
  const session = token ? await readSessionToken(token, "administrator") : null;
  if (!session) redirect("/login");
  const supabase = getSupabaseAdmin();
  const { data: administrator, error: adminError } = await supabase.from("Administrator").select("id").eq("id", session.sub).eq("isActive", true).maybeSingle();
  if (adminError) throw new Error(`Could not verify administrator session: ${adminError.message}`);
  if (!administrator) redirect("/login");
  const [pagesResult, articlesResult, mediaResult] = await Promise.all([
    supabase.from("Page").select("*").order("updatedAt", { ascending: false }),
    supabase.from("BlogPost").select("*").order("updatedAt", { ascending: false }),
    supabase.from("MediaAsset").select("id,fileName").order("createdAt", { ascending: false }).limit(100),
  ]);
  const loadError = pagesResult.error ?? articlesResult.error ?? mediaResult.error;
  if (loadError) throw new Error(`Could not load CMS content: ${loadError.message}`);
  const pages = pagesResult.data ?? [];
  const articles = articlesResult.data ?? [];
  const categoryIds = [...new Set(articles.flatMap((article) => article.categoryId ? [article.categoryId] : []))];
  const { data: categories, error: categoriesError } = categoryIds.length
    ? await supabase.from("BlogCategory").select("id,name").in("id", categoryIds)
    : { data: [], error: null };
  if (categoriesError) throw new Error(`Could not load research categories: ${categoriesError.message}`);
  const categoryNames = new Map((categories ?? []).map((category) => [category.id, category.name]));
  const { data: tagLinks, error: tagLinksError } = articles.length
    ? await supabase.from("_BlogPostToBlogTag").select("A,B").in("A", articles.map((article) => article.id))
    : { data: [], error: null };
  if (tagLinksError) throw new Error(`Could not load research tags: ${tagLinksError.message}`);
  const tagIds = [...new Set((tagLinks ?? []).map((link) => link.B))];
  const { data: tags, error: tagsError } = tagIds.length
    ? await supabase.from("BlogTag").select("id,name").in("id", tagIds)
    : { data: [], error: null };
  if (tagsError) throw new Error(`Could not load research tags: ${tagsError.message}`);
  const tagNames = new Map((tags ?? []).map((tag) => [tag.id, tag.name]));
  return (
    <>
      <header><a href="/">Veyrith Labs CMS</a><nav><a href="/">Dashboard</a><a href="/products">Products</a><a href="/orders">Orders</a></nav></header>
      <main>
        <h1>Pages and research</h1>
        {pages.length === 0 && <section className="panel"><p>No custom pages have been published.</p></section>}
        {articles.length === 0 && <section className="panel"><p>No articles have been published.</p></section>}
        <ContentManager
          pages={pages.map(({ id, title, slug, content, status, seoTitle, seoDescription, canonicalUrl, openGraphImageId, robotsIndex }) => ({
            id, title, slug, content, status, seoTitle, seoDescription, canonicalUrl, openGraphImageId, robotsIndex,
          }))}
          articles={articles.map(({ id, title, slug, content, status, seoTitle, seoDescription, canonicalUrl, openGraphImageId, robotsIndex, excerpt, categoryId }) => ({
            id, title, slug, content, status, seoTitle, seoDescription, canonicalUrl, openGraphImageId, robotsIndex,
            excerpt, category: categoryId ? categoryNames.get(categoryId) ?? null : null,
            tags: (tagLinks ?? []).filter((link) => link.A === id).map((link) => tagNames.get(link.B)).filter((name): name is string => Boolean(name)),
          }))}
          media={mediaResult.data ?? []}
        />
      </main>
    </>
  );
}
