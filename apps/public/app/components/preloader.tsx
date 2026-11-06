"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function Preloader() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Check if user already saw the loader in this session to prevent repeated annoyance
    const alreadyLoaded = sessionStorage.getItem("veyrith_loaded");
    if (alreadyLoaded) {
      setVisible(false);
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setFading(true);
          setTimeout(() => {
            setVisible(false);
            sessionStorage.setItem("veyrith_loaded", "true");
          }, 650);
          return 100;
        }
        const diff = Math.floor(Math.random() * 14) + 8;
        return Math.min(100, prev + diff);
      });
    }, 70);

    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  return (
    <div className={`preloader-overlay ${fading ? "preloader-exit" : ""}`} aria-hidden="true">
      <div className="preloader-smoke-layer" />
      <div className="preloader-content">
        <div className="preloader-logo-wrap">
          <div className="preloader-glow-ring" />
          <div className="preloader-orbit-ring" />
          <Image
            className="preloader-logo"
            src="/brand/2453fffa-675f-44c1-b437-f26dbf678b36.jpeg"
            alt="Veyrith Labs"
            width={120}
            height={120}
            priority
          />
        </div>

        <div className="preloader-text">
          <span className="preloader-brand">VEYRITH CODE</span>
          <span className="preloader-status">INITIALIZING LOCAL RUNTIME</span>
        </div>

        <div className="preloader-bar-wrap">
          <div className="preloader-bar-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="preloader-percent">{progress}%</div>
      </div>
    </div>
  );
}

