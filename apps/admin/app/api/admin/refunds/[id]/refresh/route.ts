import { NextResponse } from "next/server";
import { getSupabaseAdmin, PaymentProvider } from "@veyrith/core/supabase";
import { getAdministratorId } from "@veyrith/core/admin-session";
import { matchesPaymentAmount, processRefundResult } from "@veyrith/core/orders";
import { getServerEnv } from "@veyrith/core/env";
import { verifyPayURefund } from "@veyrith/core/payments/payu";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Props) {
  const administratorId = await getAdministratorId(request);
  if (!administratorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const { id } = await params;
  const { data: refund, error } = await getSupabaseAdmin().from("Refund")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Could not load refund: ${error.message}`);
  if (!refund) return NextResponse.json({ error: "Refund not found" }, { status: 404 });
  if (refund.status !== "PENDING") return NextResponse.json({ error: "Only pending refunds can be refreshed." }, { status: 409 });
  const [{ data: order, error: orderError }, { data: payment, error: paymentError }] = await Promise.all([
    getSupabaseAdmin().from("Order").select("provider").eq("id", refund.orderId).maybeSingle(),
    getSupabaseAdmin().from("Payment").select("providerPaymentId").eq("id", refund.paymentId).maybeSingle(),
  ]);
  if (orderError) throw new Error(`Could not load refund order: ${orderError.message}`);
  if (paymentError) throw new Error(`Could not load refund payment: ${paymentError.message}`);
  if (!order || !payment) return NextResponse.json({ error: "Refund order or payment not found" }, { status: 404 });

  if (order.provider === PaymentProvider.RAZORPAY) {
    if (!refund.providerRefundId) return NextResponse.json({ error: "Razorpay refund ID is not available yet." }, { status: 409 });
    const env = getServerEnv();
    const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
    const response = await fetch(
      `https://api.razorpay.com/v1/refunds/${encodeURIComponent(refund.providerRefundId)}`,
      { headers: { authorization: `Basic ${auth}` }, signal: AbortSignal.timeout(10_000) },
    );
    if (!response.ok) return NextResponse.json({ error: `Razorpay status request returned HTTP ${response.status}` }, { status: 502 });
    const result = await response.json() as { status?: string; amount?: number; payment_id?: string; id?: string };
    if (result.payment_id !== payment.providerPaymentId || result.amount !== refund.amountMinor) {
      return NextResponse.json({ error: "Razorpay refund does not match the stored refund request." }, { status: 409 });
    }
    const status = result.status === "processed" ? "PROCESSED" : result.status === "failed" ? "FAILED" : "PENDING";
    await processRefundResult({ refundId: refund.id, status, providerRefundId: result.id });
    return NextResponse.json({ status });
  }

  if (!refund.providerRequestId) return NextResponse.json({ error: "PayU request ID is not available yet." }, { status: 409 });
  const verified = await verifyPayURefund(refund.providerRequestId);
  const details = verified.transaction_details?.[refund.providerRequestId]?.[refund.providerRequestId];
  if (
    verified.status !== 1 ||
    details?.request_id !== refund.providerRequestId ||
    details.mihpayid !== payment.providerPaymentId ||
    !matchesPaymentAmount(details.amt, refund.amountMinor) ||
    details.action !== "refund"
  ) {
    return NextResponse.json({ error: "PayU did not verify the refund status." }, { status: 409 });
  }
  const providerStatus = details.status?.toLowerCase();
  const status = providerStatus === "success" ? "PROCESSED" : providerStatus === "failure" ? "FAILED" : "PENDING";
  await processRefundResult({ refundId: refund.id, status, providerRefundId: refund.providerRequestId });
  return NextResponse.json({ status });
}
