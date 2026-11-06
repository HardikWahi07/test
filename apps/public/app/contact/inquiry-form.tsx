"use client";

import { useState } from "react";

export function InquiryForm() {
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        subject: form.get("subject"),
        message: form.get("message"),
      }),
    });
    const result = await response.json();
    setMessage(response.ok ? "Your message has been received." : result.error ?? "Unable to send your message.");
    if (response.ok) formElement.reset();
  }

  return (
    <form className="card" onSubmit={submit}>
      <label htmlFor="inquiry-name">Name</label><input id="inquiry-name" name="name" required maxLength={100} />
      <label htmlFor="inquiry-email">Email</label><input id="inquiry-email" name="email" type="email" required maxLength={254} />
      <label htmlFor="inquiry-subject">Subject</label><input id="inquiry-subject" name="subject" maxLength={180} />
      <label htmlFor="inquiry-message">Message</label><textarea id="inquiry-message" name="message" rows={6} required maxLength={10_000} />
      <button type="submit">Send message</button>
      <p role="status">{message}</p>
    </form>
  );
}
