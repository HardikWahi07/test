import { NextResponse } from "next/server";
import { getSupabaseAdmin, PaymentProvider } from "@veyrith/core/supabase";
import { grantOrderEntitlements, markOrderPaymentFailed, matchesPaymentAmount } from "@veyrith/core/orders";
import { verifyPayUResponseHash, verifyPayUPayment, type PayUResponse } from "@veyrith/core/payments/payu";

function toPayUResponse(form: FormData): PayUResponse {
  return Object.fromEntries(
    Array.from(form.entries()).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value]] : [],
    ),
  ) as PayUResponse;
}

export async function POST(request: Request) {
  const response = toPayUResponse(await request.formData());
  if (!verifyPayUResponseHash(response) || !response.txnid || !response.udf1) {
    return NextResponse.json({ error: "Invalid PayU response signature" }, { status: 401 });
  }
  const { data: order, error } = await getSupabaseAdmin().from("Order")
    .select("*")
    .eq("id", response.udf1)
    .eq("providerOrderId", response.txnid)
    .eq("provider", PaymentProvider.PAYU)
    .maybeSingle();
  if (error) throw new Error(`Could not load PayU order: ${error.message}`);
  if (!order || order.currency !== "INR") {
    return NextResponse.json({ error: "PayU order not found" }, { status: 404 });
  }
  if (!matchesPaymentAmount(response.amount, order.amountMinor)) {
    return NextResponse.json({ error: "PayU response amount does not match the order" }, { status: 409 });
  }

  if (response.status?.toLowerCase() === "pending") {
    return NextResponse.redirect(new URL("/checkout/result?state=pending", request.url), { status: 303 });
  }
  if (response.status?.toLowerCase() !== "success") {
    await markOrderPaymentFailed(order.id, response.error_Message ?? "PayU payment was not successful", response.mihpayid);
    return NextResponse.redirect(new URL("/checkout/result?state=failed", request.url), { status: 303 });
  }

  const verification = await verifyPayUPayment(response.txnid);
  const verifiedTransaction = verification.transaction_details?.[response.txnid];
  if (
    verification.status !== 1 ||
    verifiedTransaction?.status?.toLowerCase() !== "success" ||
    verifiedTransaction.txnid !== response.txnid ||
    !matchesPaymentAmount(verifiedTransaction.amt, order.amountMinor) ||
    !verifiedTransaction.mihpayid
  ) {
    return NextResponse.json({ error: "PayU could not confirm a successful payment" }, { status: 402 });
  }
  await grantOrderEntitlements({
    orderId: order.id,
    provider: PaymentProvider.PAYU,
    providerPaymentId: verifiedTransaction.mihpayid,
    amountMinor: order.amountMinor,
    currency: order.currency,
    webhookEventId: `${response.txnid}:success`,
    webhookPayload: {
      txnid: response.txnid,
      paymentId: verifiedTransaction.mihpayid,
      status: response.status,
      amount: order.amountMinor,
    },
  });
  return NextResponse.redirect(new URL("/checkout/result?state=success", request.url), { status: 303 });
}
