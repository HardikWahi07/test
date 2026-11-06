import type { Metadata } from "next";
import { InquiryForm } from "./inquiry-form";

export const metadata: Metadata = {
  title: "Contact & Support — Veyrith Labs",
  description: "Contact Veyrith Labs directly at support@veyrith-labs.com or submit an inquiry.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main>
      <section className="page-hero">
        <div className="badge">
          <span className="badge-pulse" />
          <span>Support &amp; Inquiries</span>
        </div>
        <h1>Get in Touch</h1>
        <p>
          Reach the Veyrith Labs engineering team directly via email at{" "}
          <a
            href="mailto:support@veyrith-labs.com"
            style={{ color: "var(--accent-light)", textDecoration: "underline" }}
          >
            support@veyrith-labs.com
          </a>
          , or submit the form below. We read and respond to every inquiry.
        </p>

        <InquiryForm />
      </section>
    </main>
  );
}
