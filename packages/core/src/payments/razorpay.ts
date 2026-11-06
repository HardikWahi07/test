import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";
import { getServerEnv } from "../env";

function razorpayClient() {
  const env = getServerEnv();
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay key ID and secret are required");
  }
  return {
    keyId: env.RAZORPAY_KEY_ID,
    keySecret: env.RAZORPAY_KEY_SECRET,
    client: new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    }),
  };
}

export async function createRazorpayOrder(input: {
  amountMinor: number;
  currency: string;
  receipt: string;
  notes: Record<string, string>;
}) {
  const { client } = razorpayClient();
  return client.orders.create({
    amount: input.amountMinor,
    currency: input.currency,
    receipt: input.receipt,
    notes: input.notes,
  });
}

export async function verifyRazorpayCheckout(input: {
  orderId: string;
  paymentId: string;
  signature: string;
  amountMinor: number;
  currency: string;
}) {
  const { client, keySecret } = razorpayClient();
  const expected = createHmac("sha256", keySecret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest();
  const supplied = Buffer.from(input.signature, "hex");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return false;
  }
  const payment = await client.payments.fetch(input.paymentId);
  return (
    payment.order_id === input.orderId &&
    payment.status === "captured" &&
    Number(payment.amount) === input.amountMinor &&
    payment.currency === input.currency
  );
}

export async function fetchCapturedRazorpayPayment(paymentId: string) {
  const { client } = razorpayClient();
  return client.payments.fetch(paymentId);
}

export async function fetchRazorpayPayment(paymentId: string) {
  const { client } = razorpayClient();
  return client.payments.fetch(paymentId);
}

export async function createRazorpayRefund(input: {
  paymentId: string;
  amountMinor: number;
  receipt: string;
}) {
  const { client } = razorpayClient();
  return client.payments.refund(input.paymentId, {
    amount: input.amountMinor,
    receipt: input.receipt,
    notes: { refundRequest: input.receipt },
  });
}

export function verifyRazorpayWebhook(rawBody: string, signature: string) {
  const secret = getServerEnv().RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Razorpay webhook secret is required");
  }
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const supplied = Buffer.from(signature, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
