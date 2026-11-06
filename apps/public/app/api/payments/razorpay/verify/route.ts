import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin, PaymentProvider } from "@veyrith/core/supabase";
import { getCustomerId } from "@veyrith/core/admin-session";
import { grantOrderEntitlements } from "@veyrith/core/orders";
import { verifyRazorpayCheckout } from "@veyrith/core/payments/razorpay";

const verification = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i),
});

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const customerId = await getCustomerId(request);
  if (!customerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = verification.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payment response" }, { status: 400 });
  const { data: order, error } = await getSupabaseAdmin().from("Order")
    .select("*")
    .eq("providerOrderId", parsed.data.razorpay_order_id)
    .eq("provider", PaymentProvider.RAZORPAY)
    .eq("customerId", customerId)
    .maybeSingle();
  if (error) throw new Error(`Could not load Razorpay order: ${error.message}`);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const verified = await verifyRazorpayCheckout({
    orderId: order.providerOrderId!,
    paymentId: parsed.data.razorpay_payment_id,
    signature: parsed.data.razorpay_signature,
    amountMinor: order.amountMinor,
    currency: order.currency,
  });
  if (!verified) return NextResponse.json({ error: "Payment could not be verified." }, { status: 402 });
  await grantOrderEntitlements({
    orderId: order.id,
    provider: PaymentProvider.RAZORPAY,
    providerPaymentId: parsed.data.razorpay_payment_id,
    amountMinor: order.amountMinor,
    currency: order.currency,
    webhookEventId: `checkout:${parsed.data.razorpay_payment_id}`,
    webhookPayload: { source: "checkout-verification" },
  });
  return NextResponse.json({ ok: true, redirectTo: "/account/downloads" });
}
