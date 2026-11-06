"use client";

import { useState } from "react";

export function RefundForm({ orderId, remainingMinor }: { orderId: string; remainingMinor: number }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const rawAmount = String(form.get("amount"));
    const amountMinor = Math.round(Number(rawAmount) * 100);
    const response = await fetch(`/api/admin/orders/${orderId}/refund`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        amountMinor,
        reason: form.get("reason"),
        revokeEntitlement: form.get("entitlementPolicy") === "revoke",
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok && response.status !== 202) {
      setMessage(result.error ?? "Refund request failed.");
      setBusy(false);
      return;
    }
    setMessage("Refund request sent. Refresh this page to see the provider status.");
    setBusy(false);
  }

  return (
    <details>
      <summary>Initiate refund</summary>
      <form onSubmit={submit}>
        <label>Amount (INR)</label>
        <input name="amount" type="number" min="0.01" max={(remainingMinor / 100).toFixed(2)} step="0.01" required />
        <label>Reason</label><input name="reason" required maxLength={500} />
        <label>Entitlement after a successful refund</label>
        <select name="entitlementPolicy" required defaultValue="">
          <option value="" disabled>Choose an access policy</option>
          <option value="keep">Keep access</option>
          <option value="revoke">Revoke access</option>
        </select>
        <button type="submit" disabled={busy}>{busy ? "Sending…" : "Submit refund"}</button>
        <p role="status">{message}</p>
      </form>
    </details>
  );
}
