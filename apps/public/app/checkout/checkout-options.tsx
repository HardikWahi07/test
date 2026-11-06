"use client";

import { useState } from "react";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

type Props = { productSlug: string; productName: string; platform: "MACOS" | "WINDOWS" };

async function loadRazorpay() {
  if (window.Razorpay) return true;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay Checkout."));
    document.body.appendChild(script);
  });
  return Boolean(window.Razorpay);
}

export function CheckoutOptions({ productSlug, productName, platform }: Props) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function begin(provider: "razorpay" | "payu") {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/checkout/${provider}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productSlug, platform }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not start checkout.");
      if (result.owned) {
        window.location.href = "/account/downloads";
        return;
      }
      if (provider === "payu") {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = result.action;
        for (const [name, value] of Object.entries(result.fields as Record<string, string>)) {
          const field = document.createElement("input");
          field.type = "hidden";
          field.name = name;
          field.value = value;
          form.appendChild(field);
        }
        document.body.appendChild(form);
        form.submit();
        return;
      }
      if (!(await loadRazorpay()) || !window.Razorpay) {
        throw new Error("Razorpay Checkout is unavailable.");
      }
      const checkout = new window.Razorpay({
        key: result.keyId,
        order_id: result.orderId,
        amount: result.amount,
        currency: result.currency,
        name: "Veyrith Labs",
        description: productName,
        handler: async (payment: Record<string, string>) => {
          const verified = await fetch("/api/payments/razorpay/verify", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payment),
          });
          const verificationResult = await verified.json();
          if (!verified.ok) {
            setMessage(verificationResult.error ?? "Payment verification is pending.");
            return;
          }
          window.location.href = verificationResult.redirectTo;
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      checkout.open();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Checkout could not be started.");
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <p>Choose your payment provider. Payments are verified server-side before downloads are enabled.</p>
      <div className="platforms">
        <button disabled={busy} onClick={() => begin("razorpay")}>Pay with Razorpay</button>
        <button disabled={busy} onClick={() => begin("payu")}>Pay with PayU</button>
      </div>
      <p role="status" aria-live="polite">{message}</p>
    </section>
  );
}
