import { createHash, timingSafeEqual } from "node:crypto";
import { getServerEnv } from "../env";

export interface PayUCheckoutFields {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  surl: string;
  furl: string;
  udf1: string;
  hash: string;
}

export interface PayUResponse {
  key?: string;
  txnid?: string;
  mihpayid?: string;
  amount?: string;
  status?: string;
  hash?: string;
  udf1?: string;
  [key: string]: string | undefined;
}

function credentials() {
  const env = getServerEnv();
  const salt = process.env.PAYU_MERCHANT_SALT;
  if (!env.PAYU_MERCHANT_KEY || !salt) {
    throw new Error("PayU merchant key and salt are required");
  }
  return { key: env.PAYU_MERCHANT_KEY, salt, mode: env.PAYU_MODE };
}

function sha512(value: string) {
  return createHash("sha512").update(value, "utf8").digest("hex");
}

function apiUrl(mode: "test" | "production") {
  return mode === "test"
    ? "https://test.payu.in/merchant/postservice.php?form=2"
    : "https://info.payu.in/merchant/postservice.php?form=2";
}

export function payuCheckoutUrl() {
  return credentials().mode === "test"
    ? "https://test.payu.in/_payment"
    : "https://secure.payu.in/_payment";
}

export function createPayUCheckoutFields(input: {
  txnid: string;
  amountMinor: number;
  currency: string;
  productInfo: string;
  firstName: string;
  email: string;
  phone: string;
  successUrl: string;
  failureUrl: string;
  orderId: string;
}): PayUCheckoutFields {
  const { key, salt } = credentials();
  if (input.currency !== "INR") {
    throw new Error("PayU India checkout currently supports INR orders only");
  }
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new Error("PayU requires a positive amount in minor currency units");
  }
  const amount = (input.amountMinor / 100).toFixed(2);
  const fields = {
    key,
    txnid: input.txnid,
    amount,
    productinfo: input.productInfo.slice(0, 100),
    firstname: input.firstName.slice(0, 60),
    email: input.email,
    phone: input.phone,
    surl: input.successUrl,
    furl: input.failureUrl,
    udf1: input.orderId,
    udf2: "",
    udf3: "",
    udf4: "",
    udf5: "",
    udf6: "",
    udf7: "",
    udf8: "",
    udf9: "",
    udf10: "",
  };
  const hashString = [
    fields.key,
    fields.txnid,
    fields.amount,
    fields.productinfo,
    fields.firstname,
    fields.email,
    fields.udf1,
    fields.udf2,
    fields.udf3,
    fields.udf4,
    fields.udf5,
    fields.udf6,
    fields.udf7,
    fields.udf8,
    fields.udf9,
    fields.udf10,
    salt,
  ].join("|");
  return { ...fields, hash: sha512(hashString) };
}

export function verifyPayUResponseHash(response: PayUResponse) {
  if (
    !response.hash ||
    !/^[a-f0-9]{128}$/i.test(response.hash) ||
    !response.status ||
    !response.key ||
    !response.txnid ||
    !response.amount
  ) {
    return false;
  }
  const { key, salt } = credentials();
  if (response.key !== key) return false;
  const reverseHash = [
    salt,
    response.status,
    "",
    "",
    "",
    "",
    "",
    response.udf10 ?? "",
    response.udf9 ?? "",
    response.udf8 ?? "",
    response.udf7 ?? "",
    response.udf6 ?? "",
    response.udf5 ?? "",
    response.udf4 ?? "",
    response.udf3 ?? "",
    response.udf2 ?? "",
    response.udf1 ?? "",
    response.email ?? "",
    response.firstname ?? "",
    response.productinfo ?? "",
    response.amount,
    response.txnid,
    response.key,
  ].join("|");
  const actual = Buffer.from(response.hash, "hex");
  const expected = Buffer.from(sha512(reverseHash), "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function verifyPayUPayment(txnid: string) {
  const { key, salt, mode } = credentials();
  const hash = sha512(`${key}|verify_payment|${txnid}|${salt}`);
  const response = await fetch(apiUrl(mode), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ key, command: "verify_payment", var1: txnid, hash }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`PayU verify_payment returned HTTP ${response.status}`);
  return (await response.json()) as {
    status?: number;
    transaction_details?: Record<
      string,
      { status?: string; amt?: string; mihpayid?: string; txnid?: string }
    >;
  };
}

export async function initiatePayURefund(input: {
  paymentId: string;
  token: string;
  amountMinor: number;
  callbackUrl: string;
  reason: string;
}) {
  const { key, salt, mode } = credentials();
  const amount = (input.amountMinor / 100).toFixed(2);
  const command = "cancel_refund_transaction";
  const hash = sha512(`${key}|${command}|${input.paymentId}|${input.token}|${amount}|${salt}`);
  const safeReason = input.reason.replace(/[^a-zA-Z0-9 ._-]/g, " ").slice(0, 100);
  const response = await fetch(apiUrl(mode), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      key,
      command,
      var1: input.paymentId,
      var2: input.token,
      var3: amount,
      var5: input.callbackUrl,
      var9: JSON.stringify({ refundDetails: { remarks: safeReason } }),
      hash,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`PayU refund request returned HTTP ${response.status}`);
  return (await response.json()) as {
    status?: number;
    msg?: string;
    request_id?: string;
    mihpayid?: string;
    error_code?: string;
  };
}

export async function verifyPayURefund(requestId: string) {
  const { key, salt, mode } = credentials();
  const command = "check_action_status_txnid";
  const hash = sha512(`${key}|${command}|${requestId}|${salt}`);
  const response = await fetch(apiUrl(mode), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ key, command, var1: requestId, hash }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`PayU refund status check returned HTTP ${response.status}`);
  return (await response.json()) as {
    status?: number;
    transaction_details?: Record<
      string,
      Record<
        string,
        { status?: string; request_id?: string; mihpayid?: string; amt?: string; action?: string }
      >
    >;
  };
}
