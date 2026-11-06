import { NextResponse } from "next/server";
import { getSupabaseAdmin, PaymentProvider } from "@veyrith/core/supabase";
import {
  grantOrderEntitlements,
  processFailedPaymentWebhook,
  processRefundWebhook,
} from "@veyrith/core/orders";
import {
  fetchCapturedRazorpayPayment,
  fetchRazorpayPayment,
  verifyRazorpayWebhook,
} from "@veyrith/core/payments/razorpay";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  const eventId = request.headers.get("x-razorpay-event-id");
  if (!signature || !eventId || eventId.length > 200) {
    return NextResponse.json({ error: "Missing webhook signature or event ID" }, { status: 400 });
  }
  if (!verifyRazorpayWebhook(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let event: {
    event?: string;
    payload?: { payment?: { entity?: { id?: string } } };
  };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid JSON webhook body" }, { status: 400 });
  }
  if (event.event === "refund.processed" || event.event === "refund.failed") {
    const refundData = (JSON.parse(rawBody) as {
      payload?: { refund?: { entity?: { id?: string; payment_id?: string; amount?: number; status?: string } } };
    }).payload?.refund?.entity;
    if (!refundData?.id || !refundData.payment_id || typeof refundData.amount !== "number") {
      return NextResponse.json({ error: "Refund webhook is missing required fields" }, { status: 400 });
    }
    const { data: payment, error: paymentError } = await getSupabaseAdmin().from("Payment")
      .select("id")
      .eq("provider", PaymentProvider.RAZORPAY)
      .eq("providerPaymentId", refundData.payment_id)
      .maybeSingle();
    if (paymentError) throw new Error(`Could not load Razorpay refund payment: ${paymentError.message}`);
    const { data: refund, error: refundError } = payment
      ? await getSupabaseAdmin().from("Refund").select("*")
          .eq("providerRefundId", refundData.id).eq("paymentId", payment.id).maybeSingle()
      : { data: null, error: null };
    if (refundError) throw new Error(`Could not load Razorpay refund: ${refundError.message}`);
    if (!refund || refund.amountMinor !== refundData.amount) {
      return NextResponse.json({ error: "Refund record not found or amount mismatch" }, { status: 404 });
    }
    await processRefundWebhook({
      provider: PaymentProvider.RAZORPAY,
      eventId,
      refundId: refund.id,
      status: event.event === "refund.processed" ? "PROCESSED" : "FAILED",
      providerRefundId: refundData.id,
      payload: {
        event: event.event,
        refundId: refundData.id,
        paymentId: refundData.payment_id,
        amount: refundData.amount,
      },
    });
    return NextResponse.json({ received: true });
  }
  if (event.event !== "payment.captured" && event.event !== "payment.failed") {
    return NextResponse.json({ received: true });
  }
  const paymentId = event.payload?.payment?.entity?.id;
  if (!paymentId) return NextResponse.json({ error: "Captured payment is missing its ID" }, { status: 400 });

  const payment = event.event === "payment.captured"
    ? await fetchCapturedRazorpayPayment(paymentId)
    : await fetchRazorpayPayment(paymentId);
  if (event.event === "payment.failed") {
    if (payment.status !== "failed" || typeof payment.order_id !== "string") {
      return NextResponse.json({ error: "Razorpay payment is not failed" }, { status: 409 });
    }
    const { data: failedOrder, error: failedOrderError } = await getSupabaseAdmin().from("Order")
      .select("id")
      .eq("providerOrderId", payment.order_id)
      .eq("provider", PaymentProvider.RAZORPAY)
      .maybeSingle();
    if (failedOrderError) throw new Error(`Could not load failed Razorpay order: ${failedOrderError.message}`);
    if (!failedOrder) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    await processFailedPaymentWebhook({
      provider: PaymentProvider.RAZORPAY,
      eventId,
      orderId: failedOrder.id,
      paymentId,
      payload: {
        event: event.event,
        paymentId,
        orderId: payment.order_id,
        status: payment.status,
        errorCode: payment.error_code ?? null,
      },
      failureCode: payment.error_code ?? undefined,
      failureMessage: payment.error_description ?? undefined,
    });
    return NextResponse.json({ received: true });
  }
  if (
    payment.status !== "captured" ||
    typeof payment.order_id !== "string" ||
    !payment.amount ||
    !payment.currency
  ) {
    return NextResponse.json({ error: "Razorpay payment is not captured" }, { status: 409 });
  }
  const { data: order, error: orderError } = await getSupabaseAdmin().from("Order")
    .select("*")
    .eq("providerOrderId", payment.order_id)
    .eq("provider", PaymentProvider.RAZORPAY)
    .maybeSingle();
  if (orderError) throw new Error(`Could not load captured Razorpay order: ${orderError.message}`);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  await grantOrderEntitlements({
    orderId: order.id,
    provider: PaymentProvider.RAZORPAY,
    providerPaymentId: paymentId,
    amountMinor: Number(payment.amount),
    currency: payment.currency,
    webhookEventId: eventId,
    webhookPayload: {
      event: event.event,
      paymentId,
      orderId: payment.order_id,
      amount: Number(payment.amount),
      currency: payment.currency,
    },
  });
  return NextResponse.json({ received: true });
}
