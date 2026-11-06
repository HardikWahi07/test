import Link from "next/link";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@veyrith/core";
import { readSessionToken } from "@veyrith/core/session";
import { AccountForms } from "./account-forms";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ purchase?: string; platform?: string }>;
}) {
  const token = (await cookies()).get("veyrith_customer")?.value;
  const session = token ? await readSessionToken(token, "customer") : null;
  const query = await searchParams;

  if (!session) {
    const returnTo = query.purchase
      ? `/checkout?product=${encodeURIComponent(query.purchase)}&platform=${query.platform === "WINDOWS" ? "WINDOWS" : "MACOS"}`
      : "/account/downloads";
    return (
      <main>
        <section className="page-hero" style={{ maxWidth: 560 }}>
          <div className="badge">
            <span className="badge-pulse" />
            <span>Customer Portal</span>
          </div>
          <h1>Sign In or Create Account</h1>
          <p>
            Access your product licenses, download links, and order history.
          </p>
        </section>
        <AccountForms returnTo={returnTo} />
      </main>
    );
  }

  const { data: customer, error } = await getSupabaseAdmin()
    .from("Customer")
    .select("email,name")
    .eq("id", session.sub)
    .maybeSingle();

  if (error) throw new Error(`Could not load customer account: ${error.message}`);
  if (!customer) {
    return (
      <main>
        <section className="page-hero">
          <p>Account not found. Please sign in again.</p>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="page-hero">
        <div className="badge">
          <span className="badge-pulse" />
          <span>Active Session</span>
        </div>
        <h1>Welcome back{customer.name ? `, ${customer.name}` : ""}</h1>
        <p style={{ fontFamily: "var(--mono)", fontSize: 14 }}>{customer.email}</p>
      </section>

      <section className="account-dashboard">
        <div className="account-card">
          <div className="section-eyebrow">Your Downloads</div>
          <h3>Purchases &amp; Licenses</h3>
          <p>View your purchased Veyrith Code products, download installers, and manage license keys.</p>
          <Link className="btn btn-primary" href="/account/downloads">
            View Downloads
          </Link>
        </div>

        <div className="account-card">
          <div className="section-eyebrow">Hardware Check</div>
          <h3>Compatibility Diagnostic</h3>
          <p>Verify your hardware meets Veyrith Code requirements and estimate local inference throughput.</p>
          <Link className="btn btn-secondary" href="/compatibility">
            Run Diagnostic
          </Link>
        </div>

        <div className="account-card">
          <div className="section-eyebrow">Support</div>
          <h3>Contact Engineering</h3>
          <p>Reach our core systems team for technical inquiries, bug reports, or licensing questions.</p>
          <Link className="btn btn-secondary" href="/contact">
            Contact Support
          </Link>
        </div>
      </section>

      <div style={{ marginTop: 32 }}>
        <form action="/api/auth/customer/logout" method="post" style={{ margin: 0, padding: 0, background: "none", border: "none", boxShadow: "none" }}>
          <button className="btn btn-secondary" type="submit" style={{ margin: 0, fontSize: 13 }}>
            Sign Out
          </button>
        </form>
      </div>
    </main>
  );
}
