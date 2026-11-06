import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPayUCheckoutFields,
  verifyPayUResponseHash,
  type PayUResponse,
} from "./payu";

const salt = "test-merchant-salt";

function hash(value: string) {
  return createHash("sha512").update(value, "utf8").digest("hex");
}

describe("PayU checkout", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SESSION_SECRET", "test-session-secret-with-at-least-32-characters");
    vi.stubEnv("PUBLIC_SITE_URL", "https://shop.example.test");
    vi.stubEnv("ADMIN_CMS_URL", "https://admin.example.test");
    vi.stubEnv("PAYU_MERCHANT_KEY", "test-merchant-key");
    vi.stubEnv("PAYU_MERCHANT_SALT", salt);
    vi.stubEnv("PAYU_MODE", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates a signed INR checkout with minor-unit conversion", () => {
    const checkout = createPayUCheckoutFields({
      txnid: "order-123",
      amountMinor: 4200,
      currency: "INR",
      productInfo: "Test App",
      firstName: "A User",
      email: "customer@example.test",
      phone: "9876543210",
      successUrl: "https://shop.example.test/api/payments/payu/callback",
      failureUrl: "https://shop.example.test/api/payments/payu/callback",
      orderId: "order-id",
    });

    expect(checkout.amount).toBe("42.00");
    expect(checkout.hash).toBe(hash([
      checkout.key,
      checkout.txnid,
      checkout.amount,
      checkout.productinfo,
      checkout.firstname,
      checkout.email,
      "order-id",
      ...Array(9).fill(""),
      salt,
    ].join("|")));
  });

  it("validates the reverse hash and rejects tampered callback fields", () => {
    const callback: PayUResponse = {
      key: "test-merchant-key",
      txnid: "order-123",
      amount: "42.00",
      productinfo: "Test App",
      firstname: "A User",
      email: "customer@example.test",
      status: "success",
      udf1: "order-id",
    };
    callback.hash = hash([
      salt,
      callback.status,
      ...Array(14).fill(""),
      callback.udf1,
      callback.email,
      callback.firstname,
      callback.productinfo,
      callback.amount,
      callback.txnid,
      callback.key,
    ].join("|"));

    expect(verifyPayUResponseHash(callback)).toBe(true);
    expect(verifyPayUResponseHash({ ...callback, amount: "420.00" })).toBe(false);
  });

  it("rejects currencies and amounts unsupported by PayU India", () => {
    const input = {
      txnid: "order-123",
      amountMinor: 4200,
      currency: "USD",
      productInfo: "Test App",
      firstName: "A User",
      email: "customer@example.test",
      phone: "9876543210",
      successUrl: "https://shop.example.test/success",
      failureUrl: "https://shop.example.test/failure",
      orderId: "order-id",
    };

    expect(() => createPayUCheckoutFields(input)).toThrow("INR");
    expect(() => createPayUCheckoutFields({ ...input, currency: "INR", amountMinor: 0 })).toThrow("positive amount");
  });
});
