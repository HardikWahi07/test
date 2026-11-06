import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, signUserToken, verifyUserToken } from "./auth.js";

describe("Backend Auth Utilities", () => {
  it("hashes password and verifies correctly", async () => {
    const raw = "super-secret-password-123!";
    const hashed = await hashPassword(raw);

    expect(hashed).toBeDefined();
    expect(hashed).toContain(":");

    const isValid = await verifyPassword(raw, hashed);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword("wrong-password", hashed);
    expect(isInvalid).toBe(false);
  });

  it("signs and verifies JWT tokens with user payload", async () => {
    const user = {
      id: "u123",
      username: "alexdev",
      email: "alex@example.com",
      role: "USER",
    };

    const token = await signUserToken(user);
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);

    const decoded = await verifyUserToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.id).toBe("u123");
    expect(decoded?.username).toBe("alexdev");
    expect(decoded?.email).toBe("alex@example.com");
  });

  it("rejects tampered JWT tokens", async () => {
    const user = { id: "u456", username: "sam", role: "USER" };
    const token = await signUserToken(user);
    const tampered = token.slice(0, -6) + "abcdef";

    const decoded = await verifyUserToken(tampered);
    expect(decoded).toBeNull();
  });
});

