"use client";

import { useRef, useState } from "react";
import Image from "next/image";

export function Hero3D() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -14;
    const rotateY = ((x - centerX) / centerX) * 14;

    setCoords({ x: rotateY, y: rotateX });
  }

  function handleMouseEnter() {
    setIsHovered(true);
  }

  function handleMouseLeave() {
    setIsHovered(false);
    setCoords({ x: 0, y: 0 });
  }

  return (
    <div
      className="hero-3d-container"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={cardRef}
        className={`hero-3d-card ${isHovered ? "is-hovered" : "is-idle-float"}`}
        style={{
          transform: isHovered
            ? `rotateY(${coords.x}deg) rotateX(${coords.y}deg)`
            : undefined,
        }}
      >
        {/* Layer 0: Subtle Smoke & Ambient Orbit Rings */}
        <div className="hero-3d-layer layer-back">
          <div className="smoke-orb smoke-orb-1" />
          <div className="smoke-orb smoke-orb-2" />
          <div className="orbit-ring-3d ring-outer" />
          <div className="orbit-ring-3d ring-inner" />
        </div>

        {/* Layer 1: Glassmorphic Main Plate */}
        <div className="hero-3d-layer layer-glass-plate">
          <div className="plate-glare" />
        </div>

        {/* Layer 2: Floating 3D Logo Emblem */}
        <div className="hero-3d-layer layer-logo">
          <div className="logo-3d-wrapper">
            <Image
              className="logo-3d-img"
              src="/brand/2453fffa-675f-44c1-b437-f26dbf678b36.jpeg"
              alt="Veyrith Code Emblem"
              width={250}
              height={250}
              priority
            />
            <div className="logo-3d-shadow" />
          </div>
        </div>

        {/* Layer 3: Floating 3D Telemetry Badges */}
        <div className="hero-3d-layer layer-badges">
          <div className="badge-3d badge-top-left">
            <span className="badge-3d-dot" />
            <span>LOCAL RUNTIME: METAL</span>
          </div>

          <div className="badge-3d badge-bottom">
            <span>VEYRITH CODE &bull; 100% PRIVATE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
