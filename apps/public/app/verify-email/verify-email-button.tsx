"use client";

import { useState } from "react";

export function VerifyEmailButton({ token }: { token: string }) {
  const [message, setMessage] = useState("");

  async function verify() {
    const response = await fetch("/api/auth/customer/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error ?? "Email verification failed.");
      return;
    }
    const savedReturnTo = sessionStorage.getItem("veyrith_return_to");
    sessionStorage.removeItem("veyrith_return_to");
    window.location.href = savedReturnTo?.startsWith("/checkout?") ? savedReturnTo : "/account/downloads";
  }

  return <><button onClick={verify}>Verify email</button><p role="status">{message}</p></>;
}
