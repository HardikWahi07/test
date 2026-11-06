"use client";

import { useState } from "react";

type Installer = {
  id: string;
  platform: "MACOS" | "WINDOWS";
  fileName: string;
  fileSize: string;
  isPublished: boolean;
  minimumOsVersion: string | null;
};
type Version = { id: string; version: string; isPublished: boolean; installers: Installer[] };
type Product = {
  id: string;
  name: string;
  slug: string;
  category: string;
  shortDescription: string;
  description: string;
  status: string;
  isPublished: boolean;
  priceMinor: number;
  currency: string;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  features: string[];
  releaseVersion: string | null;
  releaseNotes: string | null;
  systemRequirements: string | null;
  documentationUrl: string | null;
  supportInformation: string | null;
  logoMediaAssetId: string | null;
  images: { id: string; altText: string }[];
  versions: Version[];
};

async function submitJson(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error ?? "The request could not be completed.");
  }
}

export function ProductCreateForm() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    try {
      await submitJson("/api/admin/products", "POST", {
        ...body,
        priceMinor: Number(form.get("priceMinor")),
      });
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Product could not be created.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel" style={{ marginTop: 20 }}>
      <h2>Create a product</h2>
      <form onSubmit={submit}>
        <label>Name</label><input name="name" required maxLength={120} />
        <label>Slug</label><input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
        <label>Short description</label><input name="shortDescription" required maxLength={240} />
        <label>Full description</label><textarea name="description" required rows={5} />
        <label>Category</label><input name="category" required />
        <label>Price (INR paise)</label><input name="priceMinor" type="number" min={0} step={1} required />
        <label>Initial status</label>
        <select name="status"><option value="DRAFT">Draft</option><option value="COMING_SOON">Coming Soon</option><option value="BETA">Beta</option><option value="AVAILABLE">Available</option></select>
        <label>SEO title</label><input name="seoTitle" maxLength={70} />
        <label>SEO description</label><input name="seoDescription" maxLength={170} />
        <button disabled={busy} type="submit">{busy ? "Creating…" : "Create draft"}</button>
      </form>
      <p className="error" role="alert">{message}</p>
    </section>
  );
}

function InstallerUpload({ product }: { product: Product }) {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/admin/products/${product.id}/installers`, { method: "POST", body: form });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.error ?? "Installer upload failed.");
      return;
    }
    window.location.reload();
  }
  return (
    <form onSubmit={submit}>
      <h4>Upload or replace installer</h4>
      <label>Release version</label><input name="version" required maxLength={40} />
      <label>Platform</label><select name="platform"><option value="MACOS">macOS</option><option value="WINDOWS">Windows</option></select>
      <label>Minimum OS version</label><input name="minimumOsVersion" maxLength={80} />
      <label>Release notes</label><textarea name="releaseNotes" rows={3} />
      <label>Installer (.dmg, .pkg, .exe, .msi)</label><input name="file" type="file" required />
      <button type="submit">Upload installer</button>
      <p className="error" role="alert">{message}</p>
    </form>
  );
}

function MediaUpload({ product }: { product: Product }) {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/admin/products/${product.id}/media`, { method: "POST", body: form });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.error ?? "Image upload failed.");
      return;
    }
    window.location.reload();
  }
  return (
    <form onSubmit={submit}>
      <h4>Upload logo or screenshot</h4>
      <label>Asset type</label><select name="kind"><option value="logo">Product logo</option><option value="screenshot">Screenshot</option></select>
      <label>Alt text</label><input name="altText" required maxLength={250} />
      <label>Image (JPEG, PNG, WebP)</label><input name="file" type="file" accept="image/jpeg,image/png,image/webp" required />
      <button type="submit">Upload image</button>
      <p className="error" role="alert">{message}</p>
    </form>
  );
}

export function ProductManager({ products }: { products: Product[] }) {
  const [message, setMessage] = useState("");
  async function setPublication(product: Product, isPublished: boolean) {
    try {
      await submitJson(`/api/admin/products/${product.id}`, "PATCH", { isPublished });
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Product update failed.");
    }
  }
  async function setStatus(product: Product, status: string) {
    try {
      const publishable = ["AVAILABLE", "BETA", "COMING_SOON"].includes(status);
      await submitJson(`/api/admin/products/${product.id}`, "PATCH", {
        status,
        isPublished: publishable && product.isPublished,
      });
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Product update failed.");
    }
  }
  async function publishInstaller(productId: string, installerId: string) {
    try {
      await submitJson(`/api/admin/products/${productId}/installers/${installerId}`, "PATCH");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Installer update failed.");
    }
  }
  async function deleteProduct(product: Product) {
    if (!window.confirm(`Permanently delete ${product.name}? This is only allowed when there is no purchase history.`)) return;
    try {
      await submitJson(`/api/admin/products/${product.id}`, "DELETE");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Product deletion failed.");
    }
  }
  async function editProduct(event: React.FormEvent<HTMLFormElement>, product: Product) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await submitJson(`/api/admin/products/${product.id}`, "PATCH", {
        name: form.get("name"),
        slug: form.get("slug"),
        category: form.get("category"),
        shortDescription: form.get("shortDescription"),
        description: form.get("description"),
        priceMinor: Number(form.get("priceMinor")),
        features: String(form.get("features") ?? "").split("\n").map((item) => item.trim()).filter(Boolean),
        releaseVersion: form.get("releaseVersion") || null,
        releaseNotes: form.get("releaseNotes") || null,
        systemRequirements: form.get("systemRequirements") || null,
        documentationUrl: form.get("documentationUrl") || null,
        supportInformation: form.get("supportInformation") || null,
        seoTitle: form.get("seoTitle") || null,
        seoDescription: form.get("seoDescription") || null,
        canonicalUrl: form.get("canonicalUrl") || null,
      });
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Product update failed.");
    }
  }

  return (
    <>
      <p className="error" role="alert">{message}</p>
      {products.length > 0 && products.map((product) => {
        const warnings = [
          !product.seoTitle && "Missing SEO title",
          !product.seoDescription && "Missing SEO description",
          !product.canonicalUrl && "Missing canonical URL",
          !product.logoMediaAssetId && "Missing product logo / Open Graph image",
          product.images.some((image) => !image.altText) && "Missing screenshot alt text",
        ].filter(Boolean);
        return (
          <article className="panel" key={product.id} style={{ marginBottom: 18 }}>
            <h2>{product.name}</h2>
            <p>/{product.slug} · {product.status.toLowerCase()} · {product.isPublished ? "Published" : "Unpublished"} · {(product.priceMinor / 100).toFixed(2)} {product.currency}</p>
            {warnings.length > 0 && <p className="error">SEO warnings: {warnings.join("; ")}</p>}
            <div className="platforms">
              <button onClick={() => setPublication(product, !product.isPublished)}>{product.isPublished ? "Unpublish" : "Publish"}</button>
              <select aria-label={`Set ${product.name} status`} value={product.status} onChange={(event) => setStatus(product, event.target.value)}>
                {["DRAFT", "COMING_SOON", "BETA", "AVAILABLE", "DISCONTINUED", "ARCHIVED"].map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
              </select>
              <button onClick={() => deleteProduct(product)}>Delete</button>
            </div>
            <details>
              <summary>Edit product details and SEO</summary>
              <form onSubmit={(event) => editProduct(event, product)}>
                <label>Name</label><input name="name" defaultValue={product.name} required maxLength={120} />
                <label>Slug</label><input name="slug" defaultValue={product.slug} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
                <label>Category</label><input name="category" defaultValue={product.category} required />
                <label>Short description</label><input name="shortDescription" defaultValue={product.shortDescription} required maxLength={240} />
                <label>Full description</label><textarea name="description" defaultValue={product.description} rows={5} required />
                <label>Price (INR paise)</label><input name="priceMinor" defaultValue={product.priceMinor} type="number" min={0} required />
                <label>Features (one per line)</label><textarea name="features" defaultValue={product.features.join("\n")} rows={4} />
                <label>Release version</label><input name="releaseVersion" defaultValue={product.releaseVersion ?? ""} />
                <label>Release notes</label><textarea name="releaseNotes" defaultValue={product.releaseNotes ?? ""} rows={3} />
                <label>System requirements</label><textarea name="systemRequirements" defaultValue={product.systemRequirements ?? ""} rows={3} />
                <label>Documentation URL</label><input name="documentationUrl" defaultValue={product.documentationUrl ?? ""} type="url" />
                <label>Support information</label><textarea name="supportInformation" defaultValue={product.supportInformation ?? ""} rows={3} />
                <label>SEO title</label><input name="seoTitle" defaultValue={product.seoTitle ?? ""} maxLength={70} />
                <label>SEO description</label><input name="seoDescription" defaultValue={product.seoDescription ?? ""} maxLength={170} />
                <label>Canonical URL</label><input name="canonicalUrl" defaultValue={product.canonicalUrl ?? ""} type="url" />
                <button type="submit">Save changes</button>
              </form>
            </details>
            <details>
              <summary>Installer releases ({product.versions.length})</summary>
              {product.versions.map((version) => (
                <section key={version.id}>
                  <h3>Version {version.version} {version.isPublished ? "· Published" : "· Draft"}</h3>
                  {version.installers.map((installer) => (
                    <p key={installer.id}>
                      {installer.platform}: {installer.fileName} ({(Number(installer.fileSize) / 1024 / 1024).toFixed(1)} MiB)
                      {installer.minimumOsVersion ? ` · minimum OS ${installer.minimumOsVersion}` : ""}
                      {installer.isPublished ? " · Published" : " · Draft"}
                      {!installer.isPublished && <button onClick={() => publishInstaller(product.id, installer.id)}>Publish installer</button>}
                    </p>
                  ))}
                </section>
              ))}
              <InstallerUpload product={product} />
            </details>
            <details>
              <summary>Product images ({product.images.length + (product.logoMediaAssetId ? 1 : 0)})</summary>
              <MediaUpload product={product} />
            </details>
          </article>
        );
      })}
      <ProductCreateForm />
    </>
  );
}
