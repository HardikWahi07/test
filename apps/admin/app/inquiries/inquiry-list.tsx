"use client";

import { useState } from "react";

type Inquiry = { id: string; name: string; email: string; subject: string | null; message: string; createdAt: string; handledAt: string | null };

export function InquiryList({ inquiries }: { inquiries: Inquiry[] }) {
  const [error, setError] = useState("");
  async function toggle(inquiry: Inquiry) {
    const response = await fetch(`/api/admin/inquiries/${inquiry.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ handled: !inquiry.handledAt }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Could not update inquiry.");
      return;
    }
    window.location.reload();
  }
  return (
    <section className="panel">
      {error && <p className="error">{error}</p>}
      {inquiries.map((inquiry) => (
        <article key={inquiry.id} style={{ borderBottom: "1px solid #dce2eb", padding: "16px 0" }}>
          <strong>{inquiry.subject || "No subject"}</strong>
          <p>{inquiry.name} · <a href={`mailto:${inquiry.email}`}>{inquiry.email}</a> · {new Date(inquiry.createdAt).toLocaleString()}</p>
          <p>{inquiry.message}</p>
          <button onClick={() => toggle(inquiry)}>{inquiry.handledAt ? "Mark as new" : "Mark handled"}</button>
        </article>
      ))}
    </section>
  );
}
