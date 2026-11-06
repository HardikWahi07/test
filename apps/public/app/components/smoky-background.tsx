"use client";

export function SmokyBackground() {
  return (
    <div className="smoky-ambient-wrapper" aria-hidden="true">
      <div className="smoke-cloud smoke-cloud-1" />
      <div className="smoke-cloud smoke-cloud-2" />
      <div className="smoke-cloud smoke-cloud-3" />
      <div className="smoke-dust-overlay" />
    </div>
  );
}

