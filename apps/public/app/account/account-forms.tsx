"use client";

import { useState, useId } from "react";

type TabMode = "signin" | "register" | "verify";

export function AccountForms({ returnTo }: { returnTo: string }) {
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"info" | "error">("info");
  const [activeTab, setActiveTab] = useState<TabMode>("signin");
  const [loading, setLoading] = useState(false);

  const loginEmailId = useId();
  const loginPasswordId = useId();
  const regNameId = useId();
  const regEmailId = useId();
  const regPhoneId = useId();
  const regPasswordId = useId();
  const verifyEmailId = useId();

  async function submit(
    event: React.FormEvent<HTMLFormElement>,
    endpoint: string,
    payload: Record<string, string>,
  ) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        setMessageType("error");
        setMessage(result.error ?? "Unable to continue. Please try again.");
        return;
      }

      if (endpoint.endsWith("/register")) {
        sessionStorage.setItem("veyrith_return_to", returnTo);
        setMessageType("info");
        setMessage("Account created. If this address needs verification, a link has been sent. Otherwise, switch to Sign In.");
        return;
      }

      if (endpoint.endsWith("/resend-verification")) {
        setMessageType("info");
        setMessage("If the account needs verification, a verification email has been sent.");
        return;
      }

      window.location.href = returnTo;
    } catch {
      setMessageType("error");
      setMessage("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      {/* Tab Switcher */}
      <div className="auth-tabs">
        <button
          type="button"
          className={`auth-tab ${activeTab === "signin" ? "active" : ""}`}
          onClick={() => { setActiveTab("signin"); setMessage(""); }}
        >
          Sign In
        </button>
        <button
          type="button"
          className={`auth-tab ${activeTab === "register" ? "active" : ""}`}
          onClick={() => { setActiveTab("register"); setMessage(""); }}
        >
          Create Account
        </button>
        <button
          type="button"
          className={`auth-tab ${activeTab === "verify" ? "active" : ""}`}
          onClick={() => { setActiveTab("verify"); setMessage(""); }}
        >
          Resend Verification
        </button>
      </div>

      {/* Sign In Form */}
      {activeTab === "signin" && (
        <form
          className="auth-form"
          onSubmit={(event) => {
            const form = new FormData(event.currentTarget);
            void submit(event, "/api/auth/customer/login", {
              email: String(form.get("email")),
              password: String(form.get("password")),
            });
          }}
        >
          <div className="auth-form-header">
            <h2 className="auth-form-title">Sign in to your account</h2>
            <p className="auth-form-subtitle">
              Access your product licenses, downloads, and order history.
            </p>
          </div>

          <div className="auth-field">
            <label htmlFor={loginEmailId} className="auth-label">Email Address</label>
            <input
              id={loginEmailId}
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="auth-input"
              disabled={loading}
            />
          </div>

          <div className="auth-field">
            <label htmlFor={loginPasswordId} className="auth-label">Password</label>
            <input
              id={loginPasswordId}
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              className="auth-input"
              disabled={loading}
            />
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <p className="auth-switch-hint">
            No account yet?{" "}
            <button type="button" className="auth-link" onClick={() => { setActiveTab("register"); setMessage(""); }}>
              Create one
            </button>
          </p>
        </form>
      )}

      {/* Create Account Form */}
      {activeTab === "register" && (
        <form
          className="auth-form"
          onSubmit={(event) => {
            const form = new FormData(event.currentTarget);
            void submit(event, "/api/auth/customer/register", {
              name: String(form.get("name")),
              email: String(form.get("email")),
              phone: String(form.get("phone")),
              password: String(form.get("password")),
            });
          }}
        >
          <div className="auth-form-header">
            <h2 className="auth-form-title">Create your account</h2>
            <p className="auth-form-subtitle">
              Register to purchase and download Veyrith Code products.
            </p>
          </div>

          <div className="auth-field">
            <label htmlFor={regNameId} className="auth-label">Full Name</label>
            <input
              id={regNameId}
              name="name"
              required
              autoComplete="name"
              placeholder="Your full name"
              className="auth-input"
              disabled={loading}
            />
          </div>

          <div className="auth-field">
            <label htmlFor={regEmailId} className="auth-label">Email Address</label>
            <input
              id={regEmailId}
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="auth-input"
              disabled={loading}
            />
          </div>

          <div className="auth-field">
            <label htmlFor={regPhoneId} className="auth-label">Mobile Number</label>
            <input
              id={regPhoneId}
              name="phone"
              type="tel"
              pattern="[6-9][0-9]{9}"
              required
              autoComplete="tel"
              placeholder="9876543210"
              className="auth-input"
              disabled={loading}
            />
            <span className="auth-hint">Indian mobile number (10 digits starting with 6-9)</span>
          </div>

          <div className="auth-field">
            <label htmlFor={regPasswordId} className="auth-label">Password</label>
            <input
              id={regPasswordId}
              name="password"
              type="password"
              minLength={14}
              required
              autoComplete="new-password"
              placeholder="Minimum 14 characters"
              className="auth-input"
              disabled={loading}
            />
            <span className="auth-hint">Must be at least 14 characters for your security</span>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <p className="auth-switch-hint">
            Already have an account?{" "}
            <button type="button" className="auth-link" onClick={() => { setActiveTab("signin"); setMessage(""); }}>
              Sign in instead
            </button>
          </p>
        </form>
      )}

      {/* Resend Verification Form */}
      {activeTab === "verify" && (
        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void submit(event, "/api/auth/customer/resend-verification", {
              email: String(form.get("email")),
            });
          }}
        >
          <div className="auth-form-header">
            <h2 className="auth-form-title">Resend verification email</h2>
            <p className="auth-form-subtitle">
              Enter the email you registered with and we will send a fresh verification link.
            </p>
          </div>

          <div className="auth-field">
            <label htmlFor={verifyEmailId} className="auth-label">Email Address</label>
            <input
              id={verifyEmailId}
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="auth-input"
              disabled={loading}
            />
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Sending..." : "Resend Verification Email"}
          </button>
        </form>
      )}

      {/* Status Message */}
      {message && (
        <div className={`auth-message ${messageType === "error" ? "auth-message-error" : "auth-message-info"}`} role="status" aria-live="polite">
          {message}
        </div>
      )}
    </div>
  );
}
