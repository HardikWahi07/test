"use client";

import { useState } from "react";

type Entry = {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  openGraphImageId: string | null;
  robotsIndex: boolean;
  excerpt?: string | null;
  category?: string | null;
  tags?: string[];
};
type Media = { id: string; fileName: string };

async function send(url: string, method: string, body: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error ?? "Unable to save content.");
  }
}

function ContentForm({
  endpoint,
  media,
  article = false,
}: {
  endpoint: string;
  media: Media[];
  article?: boolean;
}) {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const status = String(form.get("status"));
    const body = {
      title: form.get("title"),
      slug: form.get("slug"),
      content: form.get("content"),
      status,
      seoTitle: form.get("seoTitle") || undefined,
      seoDescription: form.get("seoDescription") || undefined,
      canonicalUrl: form.get("canonicalUrl") || undefined,
      openGraphImageId: form.get("openGraphImageId") || undefined,
      robotsIndex: form.get("robotsIndex") === "on",
      ...(article ? {
        excerpt: form.get("excerpt") || undefined,
        category: form.get("category") || undefined,
        tags: String(form.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
      } : {}),
    };
    try {
      await send(endpoint, "POST", body);
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create content.");
    }
  }
  return (
    <form onSubmit={submit}>
      <label>Title</label><input name="title" required maxLength={180} />
      <label>Slug</label><input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={120} />
      {article && <><label>Excerpt</label><input name="excerpt" maxLength={500} /><label>Category</label><input name="category" /><label>Tags (comma-separated)</label><input name="tags" /></>}
      <label>Content</label><textarea name="content" required rows={7} />
      <label>Publication status</label><select name="status"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select>
      <label>SEO title</label><input name="seoTitle" maxLength={70} />
      <label>SEO description</label><input name="seoDescription" maxLength={170} />
      <label>Canonical URL</label><input name="canonicalUrl" type="url" />
      <label>Open Graph image</label><select name="openGraphImageId"><option value="">None</option>{media.map((item) => <option key={item.id} value={item.id}>{item.fileName}</option>)}</select>
      <label><input name="robotsIndex" type="checkbox" defaultChecked /> Allow search indexing</label>
      <button type="submit">Create {article ? "article" : "page"}</button>
      <p className="error" role="alert">{message}</p>
    </form>
  );
}

function EntryEditor({
  entry,
  endpoint,
  media,
}: {
  entry: Entry;
  endpoint: string;
  media: Media[];
}) {
  const [message, setMessage] = useState("");
  const warnings = [
    !entry.seoTitle && "Missing title",
    !entry.seoDescription && "Missing description",
    !entry.canonicalUrl && "Missing canonical URL",
    !entry.openGraphImageId && "Missing Open Graph image",
  ].filter(Boolean);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await send(endpoint, "PATCH", {
        title: form.get("title"),
        slug: form.get("slug"),
        content: form.get("content"),
        status: form.get("status"),
        seoTitle: form.get("seoTitle") || null,
        seoDescription: form.get("seoDescription") || null,
        canonicalUrl: form.get("canonicalUrl") || null,
        openGraphImageId: form.get("openGraphImageId") || null,
        robotsIndex: form.get("robotsIndex") === "on",
        ...(entry.excerpt !== undefined ? {
          excerpt: form.get("excerpt") || null,
          category: form.get("category") || null,
          tags: String(form.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
        } : {}),
      });
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update content.");
    }
  }
  return (
    <details className="panel" style={{ margin: "14px 0" }}>
      <summary>{entry.title} · {entry.status.toLowerCase()} · /{entry.slug}</summary>
      {warnings.length > 0 && <p className="error">SEO warnings: {warnings.join("; ")}. Structured data is generated from published content.</p>}
      <form onSubmit={save}>
        <label>Title</label><input name="title" defaultValue={entry.title} required />
        <label>Slug</label><input name="slug" defaultValue={entry.slug} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required />
        <label>Content</label><textarea name="content" defaultValue={entry.content} rows={7} required />
        {entry.excerpt !== undefined && <>
          <label>Excerpt</label><input name="excerpt" defaultValue={entry.excerpt ?? ""} maxLength={500} />
          <label>Category</label><input name="category" defaultValue={entry.category ?? ""} />
          <label>Tags (comma-separated)</label><input name="tags" defaultValue={entry.tags?.join(", ") ?? ""} />
        </>}
        <label>Status</label><select name="status" defaultValue={entry.status}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select>
        <label>SEO title</label><input name="seoTitle" defaultValue={entry.seoTitle ?? ""} maxLength={70} />
        <label>SEO description</label><input name="seoDescription" defaultValue={entry.seoDescription ?? ""} maxLength={170} />
        <label>Canonical URL</label><input name="canonicalUrl" defaultValue={entry.canonicalUrl ?? ""} type="url" />
        <label>Open Graph image</label><select name="openGraphImageId" defaultValue={entry.openGraphImageId ?? ""}><option value="">None</option>{media.map((item) => <option key={item.id} value={item.id}>{item.fileName}</option>)}</select>
        <label><input name="robotsIndex" type="checkbox" defaultChecked={entry.robotsIndex} /> Allow search indexing</label>
        <button type="submit">Save content</button>
        <p className="error" role="alert">{message}</p>
      </form>
    </details>
  );
}

export function ContentManager({
  pages,
  articles,
  media,
}: {
  pages: Entry[];
  articles: Entry[];
  media: Media[];
}) {
  return (
    <>
      <section className="panel">
        <h2>Pages</h2>
        {pages.map((page) => <EntryEditor key={page.id} entry={page} endpoint={`/api/admin/content/pages/${page.id}`} media={media} />)}
        <details><summary>Create a page</summary><ContentForm endpoint="/api/admin/content/pages" media={media} /></details>
      </section>
      <section className="panel" style={{ marginTop: 18 }}>
        <h2>Research articles</h2>
        {articles.map((article) => <EntryEditor key={article.id} entry={article} endpoint={`/api/admin/content/articles/${article.id}`} media={media} />)}
        <details><summary>Create an article</summary><ContentForm endpoint="/api/admin/content/articles" media={media} article /></details>
      </section>
    </>
  );
}
