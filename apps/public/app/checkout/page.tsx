import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@veyrith/core";
import { readSessionToken } from "@veyrith/core/session";
import { CheckoutOptions } from "./checkout-options";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ product?: string; platform?: string }> };

export default async function CheckoutPage({ searchParams }: Props) {
  const { product: slug, platform: platformParam } = await searchParams;
  const platform = platformParam === "WINDOWS" ? "WINDOWS" : "MACOS";
  if (!slug) notFound();
  const supabase = getSupabaseAdmin();
  const { data: product, error: productError } = await supabase
    .from("Product")
    .select("id,name,slug,priceMinor,currency")
    .eq("slug", slug)
    .eq("isPublished", true)
    .in("status", ["AVAILABLE", "BETA"])
    .maybeSingle();
  if (productError) throw new Error(`Could not load checkout product: ${productError.message}`);
  if (!product) notFound();
  const token = (await cookies()).get("veyrith_customer")?.value;
  const session = token ? await readSessionToken(token, "customer") : null;
  if (!session) {
    redirect(`/account?purchase=${encodeURIComponent(product.slug)}&platform=${platform}`);
  }
  const { data: entitlement, error: entitlementError } = await supabase
    .from("Entitlement")
    .select("id")
    .eq("customerId", session.sub)
    .eq("productId", product.id)
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (entitlementError) throw new Error(`Could not check product entitlement: ${entitlementError.message}`);
  if (entitlement) redirect("/account/downloads");

  return (
    <main>
      <section className="page-hero">
        <div className="badge">
          <span className="badge-pulse" />
          <span>Perpetual Licence Checkout</span>
        </div>
        <h1>{product.name}</h1>
        <p>Purchase perpetual licence for {platform === "MACOS" ? "macOS" : "Windows"}.</p>
        <p style={{ fontFamily: "var(--mono)", fontSize: 18, color: "var(--text)" }}>
          {new Intl.NumberFormat("en-IN", { style: "currency", currency: product.currency }).format(product.priceMinor / 100)}
        </p>
      </section>
      <CheckoutOptions productSlug={product.slug} productName={product.name} platform={platform} />
    </main>
  );
}
