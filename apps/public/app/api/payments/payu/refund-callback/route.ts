import { NextResponse } from "next/server";
import { getSupabaseAdmin, PaymentProvider } from "@veyrith/core/supabase";
import { matchesPaymentAmount, processRefundResult } from "@veyrith/core/orders";
import { verifyPayURefund } from "@veyrith/core/payments/payu";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token || token.length !== 23) return NextResponse.json({ error: "Invalid refund callback" }, { status: 400 });
  const { data: refund, error } = await getSupabaseAdmin().from("Refund")
    .select("*")
    .eq("idempotencyToken", token)
    .eq("status", "PENDING")
    .maybeSingle();
  if (error) throw new Error(`Could not load PayU refund: ${error.message}`);
  if (!refund?.providerRequestId) {
    return NextResponse.json({ error: "Refund request not found" }, { status: 404 });
  }
  const { data: payment, error: paymentError } = await getSupabaseAdmin().from("Payment")
    .select("provider,providerPaymentId")
    .eq("id", refund.paymentId)
    .maybeSingle();
  if (paymentError) throw new Error(`Could not load refund payment: ${paymentError.message}`);
  if (payment?.provider !== PaymentProvider.PAYU || !payment.providerPaymentId) {
    return NextResponse.json({ error: "Refund request not found" }, { status: 404 });
  }
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
  const status =
    providerStatus === "success"
      ? "PROCESSED"
      : providerStatus === "failure"
        ? "FAILED"
        : "PENDING";
  await processRefundResult({
    refundId: refund.id,
    status,
    providerRequestId: refund.providerRequestId,
    providerRefundId: refund.providerRequestId,
  });
  return NextResponse.json({ received: true });
}
