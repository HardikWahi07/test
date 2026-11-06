import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseAdmin, type ProductInstaller } from "@veyrith/core";
import { readSessionToken } from "@veyrith/core/session";

export const dynamic = "force-dynamic";

export default async function DownloadsPage() {
  const token = (await cookies()).get("veyrith_customer")?.value;
  const session = token ? await readSessionToken(token, "customer") : null;
  if (!session) redirect("/account");
  const supabase = getSupabaseAdmin();
  const { data: entitlements, error: entitlementError } = await supabase
    .from("Entitlement")
    .select("*")
    .eq("customerId", session.sub)
    .eq("status", "ACTIVE")
    .order("grantedAt", { ascending: false });
  if (entitlementError) throw new Error(`Could not load purchases: ${entitlementError.message}`);
  const productIds = entitlements.map((item) => item.productId);
  const orderIds = entitlements.map((item) => item.orderId);
  const [{ data: products, error: productsError }, { data: orders, error: ordersError }] = await Promise.all([
    productIds.length ? supabase.from("Product").select("id,name,slug").in("id", productIds) : Promise.resolve({ data: [], error: null }),
    orderIds.length ? supabase.from("Order").select("id,createdAt").in("id", orderIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (productsError || ordersError) throw new Error(`Could not load purchase details: ${productsError?.message ?? ordersError?.message}`);
  const { data: versions, error: versionsError } = productIds.length
    ? await supabase.from("ProductVersion").select("*").in("productId", productIds).eq("isPublished", true).order("releasedAt", { ascending: false })
    : { data: [], error: null };
  if (versionsError) throw new Error(`Could not load product versions: ${versionsError.message}`);
  const versionIds = (versions ?? []).map((version) => version.id);
  const { data: installers, error: installersError } = versionIds.length
    ? await supabase.from("ProductInstaller").select("*").in("versionId", versionIds).eq("isPublished", true)
    : { data: [], error: null };
  if (installersError) throw new Error(`Could not load product installers: ${installersError.message}`);
  const productsById = new Map((products ?? []).map((product) => [product.id, product]));
  const ordersById = new Map((orders ?? []).map((order) => [order.id, order]));
  const versionsByProduct = new Map<string, typeof versions>();
  for (const version of versions ?? []) {
    const list = versionsByProduct.get(version.productId) ?? [];
    if (!list.length) versionsByProduct.set(version.productId, [version]);
  }
  const installersByVersion = new Map<string, ProductInstaller[]>();
  for (const installer of installers ?? []) {
    const list = installersByVersion.get(installer.versionId) ?? [];
    list.push(installer);
    installersByVersion.set(installer.versionId, list);
  }
  const purchases = entitlements.flatMap((item) => {
    const product = productsById.get(item.productId);
    if (!product) return [];
    const version = versionsByProduct.get(item.productId)?.[0];
    return [{
      ...item,
      product: {
        ...product,
        versions: version ? [{ ...version, installers: installersByVersion.get(version.id) ?? [] }] : [],
      },
      order: ordersById.get(item.orderId) ?? { createdAt: item.grantedAt },
    }];
  });

  return (
    <main>
      <section className="page-hero">
        <div className="badge">
          <span className="badge-pulse" />
          <span>Customer Downloads</span>
        </div>
        <h1>Purchases &amp; Licences</h1>
        <p>Access your offline standalone installers and cryptographically verified releases.</p>
      </section>

      {purchases.length === 0 ? (
        <section className="feature-card" style={{ maxWidth: 600 }}>
          <span className="card-num">NO ACTIVE LICENCES</span>
          <h2 className="card-title">You have not purchased any products yet</h2>
          <p className="card-desc">
            Explore Veyrith Code and local model runtimes in our software catalogue.
          </p>
          <div style={{ marginTop: 20 }}>
            <Link className="btn btn-primary" href="/products">
              Browse Software
            </Link>
          </div>
        </section>
      ) : (
        <section className="product-grid">
          {purchases.map((entitlement) => (
            <article className="product-card" key={entitlement.id}>
              <span className="product-status">Licence: {entitlement.status.toLowerCase()}</span>
              <h2 className="product-title">{entitlement.product.name}</h2>
              <p className="product-desc">
                Purchased {new Date(entitlement.order.createdAt).toLocaleDateString()}
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                {entitlement.product.versions[0]?.installers.map((installer) => (
                  <a
                    className="btn btn-primary"
                    key={installer.id}
                    href={`/api/downloads?product=${encodeURIComponent(entitlement.product.slug)}&platform=${installer.platform}`}
                  >
                    Download for {installer.platform === "MACOS" ? "macOS" : "Windows"}
                  </a>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
