import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin, PaymentProvider } from "@veyrith/core/supabase";
import { getCustomerId } from "@veyrith/core/admin-session";
import { createCustomerOrder, markOrderPaymentFailed } from "@veyrith/core/orders";
import { createPayUCheckoutFields } from "@veyrith/core/payments/payu";
import { createRazorpayOrder } from "@veyrith/core/payments/razorpay";
import { getServerEnv } from "@veyrith/core/env";

type Props = { params: Promise<{ provider: string }> };
const inputSchema = z.object({
  productSlug: z.string().min(1).max(120),
  platform: z.enum(["MACOS", "WINDOWS"]),
});

export async function POST(request: Request, { params }: Props) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const customerId = await getCustomerId(request);
  if (!customerId) return NextResponse.json({ error: "Sign in before checkout." }, { status: 401 });

  const { provider: providerParam } = await params;
  const provider =
    providerParam === "razorpay"
      ? PaymentProvider.RAZORPAY
      : providerParam === "payu"
        ? PaymentProvider.PAYU
        : null;
  if (!provider) return NextResponse.json({ error: "Unknown payment provider" }, { status: 404 });

  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid checkout request" }, { status: 400 });
  const created = await createCustomerOrder({
    customerId,
    productSlug: parsed.data.productSlug,
    platform: parsed.data.platform,
    provider,
  });
  if (created.owned) return NextResponse.json({ owned: true, productSlug: parsed.data.productSlug });
  if ("pending" in created) {
    return NextResponse.json(
      { error: "There is already a pending order for this product. Wait for its payment result before trying again." },
      { status: 409 },
    );
  }

  const { data: customer, error: customerError } = await getSupabaseAdmin()
    .from("Customer")
    .select("name,email,phone")
    .eq("id", customerId)
    .maybeSingle();
  if (customerError) throw new Error(`Could not load checkout customer: ${customerError.message}`);
  if (!customer) return NextResponse.json({ error: "Customer account was not found." }, { status: 404 });

  try {
    if (provider === PaymentProvider.RAZORPAY) {
      const { RAZORPAY_KEY_ID } = getServerEnv();
      if (!RAZORPAY_KEY_ID) throw new Error("Razorpay is not configured");
      const providerOrder = await createRazorpayOrder({
        amountMinor: created.order.amountMinor,
        currency: created.order.currency,
        receipt: created.order.id,
        notes: {
          internalOrderId: created.order.id,
          customerId,
          productId: created.product.id,
          platform: parsed.data.platform,
        },
      });
      const { error: orderError } = await getSupabaseAdmin().from("Order")
        .update({ providerOrderId: providerOrder.id })
        .eq("id", created.order.id);
      if (orderError) throw new Error(`Could not save Razorpay order ID: ${orderError.message}`);
      const { error: paymentError } = await getSupabaseAdmin().from("Payment")
        .update({ status: "PENDING" })
        .eq("orderId", created.order.id);
      if (paymentError) throw new Error(`Could not update payment status: ${paymentError.message}`);
      return NextResponse.json({
        provider: "razorpay",
        keyId: RAZORPAY_KEY_ID,
        orderId: providerOrder.id,
        amount: providerOrder.amount,
        currency: providerOrder.currency,
        productName: created.product.name,
      });
    }

    if (!customer.phone) {
      throw new Error("Add an Indian mobile number to your account before using PayU.");
    }
    const { PUBLIC_SITE_URL } = getServerEnv();
    const fields = createPayUCheckoutFields({
      txnid: created.order.id,
      amountMinor: created.order.amountMinor,
      currency: created.order.currency,
      productInfo: created.product.name,
      firstName: customer.name ?? customer.email.split("@")[0],
      email: customer.email,
      phone: customer.phone,
      successUrl: `${PUBLIC_SITE_URL}/api/payments/payu/callback`,
      failureUrl: `${PUBLIC_SITE_URL}/api/payments/payu/callback`,
      orderId: created.order.id,
    });
    const { error: orderError } = await getSupabaseAdmin().from("Order")
      .update({ providerOrderId: fields.txnid })
      .eq("id", created.order.id);
    if (orderError) throw new Error(`Could not save PayU transaction ID: ${orderError.message}`);
    const { error: paymentError } = await getSupabaseAdmin().from("Payment")
      .update({ status: "PENDING" })
      .eq("orderId", created.order.id);
    if (paymentError) throw new Error(`Could not update payment status: ${paymentError.message}`);
    return NextResponse.json({
      provider: "payu",
      action: (await import("@veyrith/core/payments/payu")).payuCheckoutUrl(),
      fields,
    });
  } catch (error) {
    await markOrderPaymentFailed(
      created.order.id,
      error instanceof Error ? error.message : "Payment setup failed",
    );
    throw error;
  }
}
