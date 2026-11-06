import Link from "next/link";

export const metadata = { robots: { index: false, follow: false } };

export default async function CheckoutResultPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  return (
    <main>
      <section className="hero">
        <span className="eyebrow">Payment status</span>
        <h1>{state === "success" ? "Payment verified" : state === "pending" ? "Payment pending" : "Payment not completed"}</h1>
        <p>
          {state === "success"
            ? "Your purchase is confirmed. Your product entitlement is ready."
            : state === "pending"
              ? "The payment provider has not confirmed the result yet. Downloads remain locked until verification completes."
              : "No download access was granted. You can review your account or try again."}
        </p>
        <Link className="button" href={state === "success" ? "/account/downloads" : state === "pending" ? "/account" : "/products"}>{state === "success" ? "Go to downloads" : state === "pending" ? "Check account" : "Back to products"}</Link>
      </section>
    </main>
  );
}
