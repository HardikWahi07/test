import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { PaymentProvider } from "@veyrith/core/supabase";
import { getAdministratorId } from "@veyrith/core/admin-session";
import { processRefundResult, reserveCustomerRefund } from "@veyrith/core/orders";
import { createRazorpayRefund } from "@veyrith/core/payments/razorpay";
import { initiatePayURefund } from "@veyrith/core/payments/payu";
import { getPublicSiteUrl } from "@veyrith/core/env";

type Props = { params: Promise<{ id: string }> };
const refundRequest = z.object({
  amountMinor: z.number().int().positive(),
  reason: z.string().trim().min(1).max(500),
  revokeEntitlement: z.boolean(),
});

export async function POST(request: Request, { params }: Props) {
  const administratorId = await getAdministratorId(request);
  if (!administratorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const parsed = refundRequest.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Provide a refund amount, reason, and entitlement decision." }, { status: 400 });
  const { id } = await params;
  const token = randomUUID().replaceAll("-", "").slice(0, 23);
  const reserved = await reserveCustomerRefund({
    orderId: id,
    administratorId,
    amountMinor: parsed.data.amountMinor,
    reason: parsed.data.reason,
    revokeEntitlement: parsed.data.revokeEntitlement,
    idempotencyToken: token,
  });
  if ("error" in reserved) return NextResponse.json({ error: reserved.error }, { status: 409 });
  const { refund, payment } = reserved;
  if (!payment.providerPaymentId) {
    return NextResponse.json({ error: "No provider payment ID is available." }, { status: 409 });
  }
  try {
    if (payment.provider === PaymentProvider.RAZORPAY) {
      const providerRefund = await createRazorpayRefund({
        paymentId: payment.providerPaymentId,
        amountMinor: parsed.data.amountMinor,
        receipt: token,
      });
      await processRefundResult({
        refundId: refund.id,
        status: providerRefund.status === "processed" ? "PROCESSED" : providerRefund.status === "failed" ? "FAILED" : "PENDING",
        providerRefundId: providerRefund.id,
      });
      return NextResponse.json({ id: refund.id, status: providerRefund.status }, { status: 202 });
    }

    const callbackUrl = `${getPublicSiteUrl()}/api/payments/payu/refund-callback?token=${token}`;
    const providerRefund = await initiatePayURefund({
      paymentId: payment.providerPaymentId,
      token,
      amountMinor: parsed.data.amountMinor,
      callbackUrl,
      reason: parsed.data.reason,
    });
    if (providerRefund.status !== 1 && providerRefund.error_code !== "102") {
      await processRefundResult({ refundId: refund.id, status: "FAILED" });
      return NextResponse.json({ error: providerRefund.msg ?? "PayU rejected the refund." }, { status: 502 });
    }
    if (!providerRefund.request_id) {
      return NextResponse.json(
        { id: refund.id, status: "pending", error: "PayU did not return a request ID. Reconcile this refund with PayU before retrying." },
        { status: 202 },
      );
    }
    await processRefundResult({
      refundId: refund.id,
      status: "PENDING",
      providerRequestId: providerRefund.request_id,
      providerRefundId: providerRefund.request_id,
    });
    return NextResponse.json({ id: refund.id, status: "pending" }, { status: 202 });
  } catch (error) {
    console.error("Refund provider request failed; refund remains pending for reconciliation.", error);
    return NextResponse.json(
      { error: "The provider response could not be confirmed. The refund is pending reconciliation; do not retry." },
      { status: 202 },
    );
  }
}
