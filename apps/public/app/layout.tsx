import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getPublicSiteUrl } from "@veyrith/core/env";
import { serializeJsonLd } from "@veyrith/core/seo";
import { Preloader } from "./components/preloader";
import { SmokyBackground } from "./components/smoky-background";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getPublicSiteUrl()),
  title: {
    default: "Veyrith Labs — Independent Systems Laboratory",
    template: "%s | Veyrith Labs",
  },
  description: "Veyrith Labs is an independent systems laboratory creating software and exploring practical engineering.",
  openGraph: {
    type: "website",
    siteName: "Veyrith Labs",
    title: "Veyrith Labs — Independent Systems Laboratory",
    description: "Veyrith Labs is an independent systems laboratory creating software and exploring practical engineering.",
    images: [{ url: "/brand/331f4053-0c92-4d3e-b0f0-4e81f1315455.jpeg" }],
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const PUBLIC_SITE_URL = getPublicSiteUrl();
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Veyrith Labs",
    url: PUBLIC_SITE_URL,
    logo: `${PUBLIC_SITE_URL}/brand/331f4053-0c92-4d3e-b0f0-4e81f1315455.jpeg`,
    foundingDate: "2026-11",
  };
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Veyrith Labs",
    url: PUBLIC_SITE_URL,
  };

  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(organization) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(website) }}
        />

        {/* Cinematic Preloader */}
        <Preloader />

        {/* Ambient Smoky Purple Background */}
        <SmokyBackground />

        {/* Sticky Glassmorphic Header */}
        <header className="site-header">
          <div className="site-header-inner">
            <Link className="brand" href="/" aria-label="Veyrith Labs Home">
              <Image
                src="/brand/331f4053-0c92-4d3e-b0f0-4e81f1315455.jpeg"
                alt="Veyrith Labs"
                width={154}
                height={46}
                priority
                className="brand-wordmark-img"
              />
            </Link>

            <nav className="nav-links" aria-label="Main Navigation">
              <Link className="nav-link" href="/products">Veyrith Code</Link>
              <Link className="nav-link" href="/compatibility">Compatibility</Link>
              <Link className="nav-link" href="/research">Research</Link>
              <Link className="nav-link" href="/about">About</Link>
              <Link className="nav-link" href="/contact">Contact</Link>
            </nav>

            <div className="header-actions">
              <Link className="btn btn-secondary" href="/account">Portal</Link>
              <Link className="btn btn-primary" href="/products">Download</Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        {children}

        {/* Studio Footer */}
        <footer className="site-footer">
          <div className="site-footer-inner">
            <div className="footer-top">
              <div>
                <div className="brand" style={{ marginBottom: 12 }}>
                  <Image
                    src="/brand/331f4053-0c92-4d3e-b0f0-4e81f1315455.jpeg"
                    alt="Veyrith Labs"
                    width={140}
                    height={42}
                    className="brand-wordmark-img"
                  />
                </div>
                <p className="footer-brand-desc">
                  Veyrith Labs is an independent systems laboratory creating software and exploring practical engineering. Veyrith Code is one of our products.
                </p>
                <p className="footer-contact-link">
                  Inquiries: <a href="mailto:support@veyrith-labs.com">support@veyrith-labs.com</a>
                </p>
              </div>

              <div className="footer-col">
                <h4>Software</h4>
                <ul>
                  <li><Link href="/products">Veyrith Code IDE</Link></li>
                  <li><Link href="/compatibility">Hardware Checker</Link></li>
                  <li><Link href="/products">Local Model Runtimes</Link></li>
                  <li><Link href="/account/downloads">Downloads &amp; Releases</Link></li>
                </ul>
              </div>

              <div className="footer-col">
                <h4>Research</h4>
                <ul>
                  <li><Link href="/research">Model Evaluations</Link></li>
                  <li><Link href="/research">Offline Knowledge Pack</Link></li>
                  <li><Link href="/about">Architecture &amp; Safety</Link></li>
                </ul>
              </div>

              <div className="footer-col">
                <h4>Contact</h4>
                <ul>
                  <li><a href="mailto:support@veyrith-labs.com">support@veyrith-labs.com</a></li>
                  <li><Link href="/contact">Direct Support Form</Link></li>
                  <li><Link href="/account">License Portal</Link></li>
                </ul>
              </div>
            </div>

            <div className="footer-bottom">
              <div className="footer-credit">
                <span>© 2026 Veyrith Labs. All rights reserved.</span>
                <span className="made-with-tag">Made with Veyrith Code</span>
              </div>
              <div className="system-status">
                <span className="system-status-dot" />
                <span>Local Engine Verified</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
