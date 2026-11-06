import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@veyrith/core";
import { readSessionToken } from "@veyrith/core/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const token = (await cookies()).get("veyrith_admin")?.value;
  const session = token ? await readSessionToken(token, "administrator") : null;
  if (!session) redirect("/login");
  const supabase = getSupabaseAdmin();
  const [administratorResult, productsResult, publishedResult, ordersResult, inquiriesResult] = await Promise.all([
    supabase.from("Administrator").select("isActive,email").eq("id", session.sub).maybeSingle(),
    supabase.from("Product").select("id", { count: "exact", head: true }),
    supabase.from("Product").select("id", { count: "exact", head: true }).eq("isPublished", true),
    supabase.from("Order").select("id", { count: "exact", head: true }),
    supabase.from("Inquiry").select("id", { count: "exact", head: true }),
  ]);
  const error = administratorResult.error ?? productsResult.error ?? publishedResult.error ?? ordersResult.error ?? inquiriesResult.error;
  if (error) throw new Error(`Could not load CMS dashboard: ${error.message}`);
  const administrator = administratorResult.data;
  if (!administrator?.isActive) redirect("/login");
  const products = productsResult.count ?? 0;
  const published = publishedResult.count ?? 0;
  const orders = ordersResult.count ?? 0;
  const inquiries = inquiriesResult.count ?? 0;
  return (
    <>
      <header>
        <strong>Veyrith Labs CMS</strong>
        <form action="/api/auth/admin/logout" method="post"><button type="submit">Sign out</button></form>
      </header>
      <main>
        <p>Signed in as {administrator.email}</p>
        <h1>Dashboard</h1>
        <p>Manage your published business content and commerce records.</p>
        <section className="stats" aria-label="CMS overview">
          <div className="stat">Products<strong>{products}</strong></div>
          <div className="stat">Published<strong>{published}</strong></div>
          <div className="stat">Orders<strong>{orders}</strong></div>
          <div className="stat">Inquiries<strong>{inquiries}</strong></div>
        </section>
        <section className="panel">
          <h2>Product management</h2>
          {products === 0 ? (
            <>
              <p>No products have been added yet.</p>
              <Link className="button" href="/products">Add your first product</Link>
            </>
          ) : (
            <Link className="button" href="/products">Manage products</Link>
          )}
        </section>
        <p><Link className="button" href="/orders">View commerce dashboard</Link></p>
        <p><Link className="button" href="/content">Manage pages and research</Link></p>
        <p><Link className="button" href="/inquiries">View customer inquiries</Link></p>
        <section className="stats">
          <div className="panel"><h2>Orders</h2><p>{orders === 0 ? "No orders have been received." : `${orders} orders recorded.`}</p></div>
          <div className="panel"><h2>Inquiries</h2><p>{inquiries === 0 ? "No customer inquiries yet." : `${inquiries} inquiries recorded.`}</p></div>
          <div className="panel"><h2>Articles</h2><p>No articles have been published.</p></div>
        </section>
      </main>
    </>
  );
}
