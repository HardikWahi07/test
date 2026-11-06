import { getSupabaseAdmin, isUniqueViolation, type PaymentProvider } from "./supabase";
import type { Database } from "./database.types";

type Json = Exclude<Database["public"]["Tables"]["PaymentWebhookEvent"]["Row"]["payload"], undefined>;
type ProductRow = Database["public"]["Tables"]["Product"]["Row"];
type OrderRow = Database["public"]["Tables"]["Order"]["Row"];
type RefundRow = Database["public"]["Tables"]["Refund"]["Row"];
type PaymentRow = Database["public"]["Tables"]["Payment"]["Row"];

function isRecord(value: Json | undefined): value is { [key: string]: Json | undefined } {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function grantOrderEntitlements(input: {
  orderId: string;
  provider: PaymentProvider;
  providerPaymentId: string;
  amountMinor: number;
  currency: string;
  webhookEventId?: string;
  webhookPayload?: Json;
}) {
  const { data, error } = await getSupabaseAdmin().rpc("grant_order_entitlements", {
    p_order_id: input.orderId,
    p_provider: input.provider,
    p_provider_payment_id: input.providerPaymentId,
    p_amount_minor: input.amountMinor,
    p_currency: input.currency,
    p_event_id: input.webhookEventId,
    p_payload: input.webhookPayload ?? {},
  });
  if (error) throw new Error(`Could not grant verified purchase: ${error.message}`);
  if (!isRecord(data) || typeof data.id !== "string" || typeof data.customerId !== "string") {
    throw new Error("Supabase returned an invalid paid-order response.");
  }
  return data as unknown as OrderRow;
}

export async function markOrderPaymentFailed(orderId: string, failureMessage: string, providerPaymentId?: string) {
  const { error } = await getSupabaseAdmin().rpc("process_failed_payment", {
    p_order_id: orderId,
    p_failure_message: failureMessage.slice(0, 500),
    p_provider_payment_id: providerPaymentId,
  });
  if (error) throw new Error(`Could not record payment failure: ${error.message}`);
}

export async function processFailedPaymentWebhook(input: {
  provider: PaymentProvider;
  eventId: string;
  orderId: string;
  paymentId: string;
  payload: Json;
  failureCode?: string;
  failureMessage?: string;
}) {
  const { error } = await getSupabaseAdmin().rpc("process_failed_payment_webhook", {
    p_provider: input.provider,
    p_event_id: input.eventId,
    p_order_id: input.orderId,
    p_payment_id: input.paymentId,
    p_payload: input.payload,
    p_failure_code: input.failureCode,
    p_failure_message: input.failureMessage?.slice(0, 500),
  });
  if (error) throw new Error(`Could not process failed payment webhook: ${error.message}`);
}

export async function processRefundResult(input: {
  refundId: string;
  status: "PENDING" | "PROCESSED" | "FAILED";
  providerRefundId?: string;
  providerRequestId?: string;
}) {
  const { data, error } = await getSupabaseAdmin().rpc("process_refund_result", {
    p_refund_id: input.refundId,
    p_status: input.status,
    p_provider_refund_id: input.providerRefundId,
    p_provider_request_id: input.providerRequestId,
  });
  if (error) throw new Error(`Could not record refund status: ${error.message}`);
  return data;
}

export async function processRefundWebhook(input: {
  provider: PaymentProvider;
  eventId: string;
  payload: Json;
  refundId: string;
  status: "PENDING" | "PROCESSED" | "FAILED";
  providerRefundId?: string;
}) {
  const { data, error } = await getSupabaseAdmin().rpc("process_refund_webhook", {
    p_provider: input.provider,
    p_event_id: input.eventId,
    p_payload: input.payload,
    p_refund_id: input.refundId,
    p_status: input.status,
    p_provider_refund_id: input.providerRefundId,
  });
  if (error) throw new Error(`Could not process refund webhook: ${error.message}`);
  return data;
}

export async function createCustomerOrder(input: {
  customerId: string;
  productSlug: string;
  platform: "MACOS" | "WINDOWS";
  provider: PaymentProvider;
}) {
  const { data, error } = await getSupabaseAdmin().rpc("create_customer_order", {
    p_customer_id: input.customerId,
    p_product_slug: input.productSlug,
    p_platform: input.platform,
    p_provider: input.provider,
  });
  if (error) throw new Error(`Could not create checkout order: ${error.message}`);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Supabase returned an invalid checkout-order response.");
  }
  if (!isRecord(data) || !isRecord(data.product) ||
      typeof data.product.id !== "string" || typeof data.product.name !== "string") {
    throw new Error("Supabase did not return a valid checkout product.");
  }
  const product = data.product as unknown as ProductRow;
  if (data.owned === true) return { owned: true as const, product };
  if (data.pending === true) return { pending: true as const, product };
  if (!isRecord(data.order) || typeof data.order.id !== "string") {
    throw new Error("Supabase did not return the created checkout order.");
  }
  return { owned: false as const, product, order: data.order as unknown as OrderRow };
}

export async function reserveCustomerRefund(input: {
  orderId: string;
  administratorId: string;
  amountMinor: number;
  reason: string;
  revokeEntitlement: boolean;
  idempotencyToken: string;
}) {
  const { data, error } = await getSupabaseAdmin().rpc("reserve_customer_refund", {
    p_order_id: input.orderId,
    p_administrator_id: input.administratorId,
    p_amount_minor: input.amountMinor,
    p_reason: input.reason,
    p_revoke_entitlement: input.revokeEntitlement,
    p_idempotency_token: input.idempotencyToken,
  });
  if (error) throw new Error(`Could not reserve refund: ${error.message}`);
  if (!isRecord(data)) throw new Error("Supabase returned an invalid refund reservation.");
  if (typeof data.error === "string") return { error: data.error } as const;
  if (!isRecord(data.refund) || !isRecord(data.order) || !isRecord(data.payment) ||
      typeof data.refund.id !== "string" || typeof data.payment.provider !== "string") {
    throw new Error("Supabase returned an incomplete refund reservation.");
  }
  return {
    refund: data.refund as unknown as RefundRow,
    order: data.order as unknown as OrderRow,
    payment: data.payment as unknown as PaymentRow,
  } as const;
}

export function paymentAmountToMinor(amount: string | number) {
  const value = typeof amount === "number" ? amount.toFixed(2) : amount;
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    throw new Error("Invalid provider payment amount");
  }
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function matchesPaymentAmount(amount: string | undefined, expectedMinor: number) {
  return amount !== undefined &&
    /^\d+(?:\.\d{1,2})?$/.test(amount) &&
    paymentAmountToMinor(amount) === expectedMinor;
}

export { isUniqueViolation };
