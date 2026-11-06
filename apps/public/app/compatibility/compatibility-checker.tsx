"use client";

import { useState, useId } from "react";
import Link from "next/link";

type PlatformType = "mac-arm64" | "mac-x64" | "win-x64" | "linux-x64";
type CpuType = "apple-m4" | "apple-m3" | "apple-m2" | "apple-m1" | "intel-13-14" | "intel-10-12" | "amd-zen4-5" | "amd-zen2-3";
type GpuType = "apple-metal" | "nvidia-high" | "nvidia-mid" | "nvidia-entry" | "amd-radeon" | "integrated";

interface Preset {
  id: string;
  name: string;
  platform: PlatformType;
  ram: number;
  cpu: CpuType;
  gpu: GpuType;
}

const PRESETS: Preset[] = [
  { id: "m3-pro", name: "MacBook Pro M3 Pro (18GB)", platform: "mac-arm64", ram: 18, cpu: "apple-m3", gpu: "apple-metal" },
  { id: "m2-air-8", name: "MacBook Air M2 (8GB)", platform: "mac-arm64", ram: 8, cpu: "apple-m2", gpu: "apple-metal" },
  { id: "m2-max-32", name: "Mac Studio M2 Max (32GB)", platform: "mac-arm64", ram: 32, cpu: "apple-m2", gpu: "apple-metal" },
  { id: "pc-rtx4080", name: "Custom PC (RTX 4080 + 32GB)", platform: "win-x64", ram: 32, cpu: "intel-13-14", gpu: "nvidia-high" },
  { id: "pc-laptop-16", name: "Developer Laptop (16GB + Intel i7)", platform: "win-x64", ram: 16, cpu: "intel-13-14", gpu: "integrated" },
];

export function CompatibilityChecker() {
  const [platform, setPlatform] = useState<PlatformType>("mac-arm64");
  const [ram, setRam] = useState<number>(18);
  const [cpu, setCpu] = useState<CpuType>("apple-m3");
  const [gpu, setGpu] = useState<GpuType>("apple-metal");
  const [activePreset, setActivePreset] = useState<string>("m3-pro");

  const platformSelectId = useId();
  const ramInputId = useId();
  const cpuSelectId = useId();
  const gpuSelectId = useId();

  const applyPreset = (preset: Preset) => {
    setActivePreset(preset.id);
    setPlatform(preset.platform);
    setRam(preset.ram);
    setCpu(preset.cpu);
    setGpu(preset.gpu);
  };

  const handlePlatformChange = (p: PlatformType) => {
    setActivePreset("");
    setPlatform(p);
    if (p === "mac-arm64") {
      setCpu("apple-m3");
      setGpu("apple-metal");
    } else if (gpu === "apple-metal") {
      setGpu("integrated");
      setCpu("intel-13-14");
    }
  };

  // Evaluation calculation
  const isAppleSilicon = platform === "mac-arm64";
  const isNvidiaHigh = gpu === "nvidia-high";
  const isNvidiaMid = gpu === "nvidia-mid";
  const isNvidiaEntry = gpu === "nvidia-entry";
  const isDedicatedNvidia = isNvidiaHigh || isNvidiaMid || isNvidiaEntry;
  const isIntegrated = gpu === "integrated";

  let statusClass = "status-optimal";
  let statusLabel = "Optimal Performance";
  let speedText = "38 - 52 tok/s";
  let scorePercent = 94;
  let recommendedModel = "Qwen3.5-9B (Q4_K_M) + 32k Context";
  let contextLimit = "32,768 Tokens (Full multi-file diffs)";
  let accelerationEngine = "Apple Silicon Metal GPU (Unified Memory)";
  let memoryBreakdown = `${ram} GB Total Unified Memory`;
  let verdict = "Outstanding hardware match. Apple Silicon Metal GPU acceleration and high unified memory bandwidth enable instant local token streaming with zero cloud roundtrips.";

  if (ram < 12) {
    statusClass = "status-constrained";
    statusLabel = "Supported with Constraints";
    scorePercent = 48;
    if (isAppleSilicon) {
      speedText = "14 - 20 tok/s";
      recommendedModel = "Qwen2.5-Coder-7B (Q3_K_S) or 3B (Q4_K_M)";
      contextLimit = "8,192 Tokens (Single file edits)";
      accelerationEngine = "Metal GPU (Memory Constrained)";
      memoryBreakdown = `${ram} GB Unified Memory (~5.2 GB model footprint leaves limited OS buffer)`;
      verdict = "Veyrith Code will run, but with 8GB RAM, memory pressure may occur if multiple heavy applications are open. We recommend closing browser tabs and selecting lighter model profiles.";
    } else {
      speedText = "4 - 8 tok/s";
      recommendedModel = "Qwen2.5-Coder-3B (Q4_K_M)";
      contextLimit = "4,096 Tokens";
      accelerationEngine = "CPU AVX2 (Memory Constrained)";
      memoryBreakdown = `${ram} GB System RAM`;
      verdict = "Minimum hardware threshold. CPU inference with 8GB RAM is usable for targeted code edits, but will be noticeably slower than GPU-accelerated configurations.";
    }
  } else if (isAppleSilicon) {
    if (ram >= 32 || cpu === "apple-m4") {
      statusClass = "status-optimal";
      statusLabel = "Optimal Performance";
      scorePercent = 98;
      speedText = cpu === "apple-m4" ? "48 - 62 tok/s" : "40 - 54 tok/s";
      recommendedModel = "Qwen3.5-9B (Q4_K_M) / DeepSeek-Coder-14B";
      contextLimit = "32,768+ Tokens (Repository-scale context)";
      accelerationEngine = "Apple Metal GPU + Neural Engine Core";
      memoryBreakdown = `${ram} GB Unified Memory (Abundant headroom for IDE, LSP & compilation)`;
      verdict = "Top-tier local AI workstation. Massive unified memory bandwidth delivers smooth, instantaneous code completions, complex agent diffing, and zero thermal throttling.";
    } else {
      statusClass = "status-supported";
      statusLabel = "Supported — High Performance";
      scorePercent = 86;
      speedText = "28 - 38 tok/s";
      recommendedModel = "Qwen3.5-9B (Q4_K_M) + 16k Context";
      contextLimit = "16,384 Tokens (Multi-file workspace context)";
      accelerationEngine = "Apple Silicon Metal GPU (14-18 GPU Cores)";
      memoryBreakdown = `${ram} GB Unified Memory (~6.2 GB allocated to inference)`;
      verdict = "Excellent configuration. Full Metal GPU offloading ensures highly responsive code reasoning, low fan noise, and negligible battery impact while coding on battery.";
    }
  } else if (isDedicatedNvidia) {
    if (isNvidiaHigh) {
      statusClass = "status-optimal";
      statusLabel = "Optimal Performance";
      scorePercent = 96;
      speedText = "50 - 72 tok/s";
      recommendedModel = "Qwen3.5-9B (Q4_K_M) 100% CUDA VRAM Offloaded";
      contextLimit = "32,768 Tokens (Large context window)";
      accelerationEngine = "NVIDIA CUDA Acceleration (Dedicated VRAM)";
      memoryBreakdown = `${ram} GB RAM + 16-24 GB GDDR6X VRAM`;
      verdict = "Blazing performance. Dedicated high-bandwidth VRAM offloading processes tokens faster than most cloud APIs, providing instantaneous agent reasoning.";
    } else {
      statusClass = "status-supported";
      statusLabel = "Supported — Good Performance";
      scorePercent = 82;
      speedText = "30 - 45 tok/s";
      recommendedModel = "Qwen3.5-9B (Q4_K_M) with partial/full CUDA offload";
      contextLimit = "16,384 Tokens";
      accelerationEngine = "NVIDIA CUDA Acceleration";
      memoryBreakdown = `${ram} GB RAM + 8-12 GB Dedicated VRAM`;
      verdict = "Very capable setup. CUDA tensor cores handle model layers effortlessly with low latency and quick response times.";
    }
  } else if (isIntegrated) {
    statusClass = "status-fallback";
    statusLabel = "CPU Fallback Mode";
    scorePercent = 54;
    speedText = "7 - 14 tok/s";
    recommendedModel = "Qwen2.5-Coder-7B (Q4_K_M) CPU AVX2 Execution";
    contextLimit = "8,192 Tokens";
    accelerationEngine = "Multi-threaded CPU AVX2 / AVX-512";
    memoryBreakdown = `${ram} GB System RAM (Shared with system)`;
    verdict = "Supported via multi-threaded CPU inference. Token generation is practical for inline suggestions and focused diffs, but will utilize significant CPU cycles during long agent tasks.";
  } else {
    // AMD Radeon GPU
    statusClass = "status-supported";
    statusLabel = "Supported — Good Performance";
    scorePercent = 78;
    speedText = "24 - 36 tok/s";
    recommendedModel = "Qwen3.5-9B (Q4_K_M) via ROCm / Vulkan";
    contextLimit = "16,384 Tokens";
    accelerationEngine = "AMD ROCm / Vulkan Acceleration";
    memoryBreakdown = `${ram} GB System RAM`;
    verdict = "Capable setup. ROCm/Vulkan runtime offloads inference computations to Radeon compute units with solid throughput.";
  }

  return (
    <div className="checker-container">
      {/* Input Controls */}
      <div className="checker-panel">
        <div>
          <div className="section-eyebrow">Interactive Diagnostic</div>
          <h2 style={{ fontSize: 24, margin: "6px 0 10px" }}>Configure Your Machine</h2>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: 0 }}>
            Choose a quick preset or customize your exact CPU, GPU, and RAM specifications below:
          </p>
        </div>

        {/* Quick Presets */}
        <div className="checker-group">
          <label className="checker-label">Quick Presets</label>
          <div className="preset-pills">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`preset-pill ${activePreset === preset.id ? "active" : ""}`}
                onClick={() => applyPreset(preset)}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Platform Selection */}
        <div className="checker-group">
          <div className="checker-group-header">
            <label htmlFor={platformSelectId} className="checker-label">Operating System &amp; Architecture</label>
            <span className="checker-hint">OS</span>
          </div>
          <select
            id={platformSelectId}
            className="checker-select"
            value={platform}
            onChange={(e) => handlePlatformChange(e.target.value as PlatformType)}
          >
            <option value="mac-arm64">macOS — Apple Silicon (M1 / M2 / M3 / M4)</option>
            <option value="win-x64">Windows 10 / 11 (x86_64)</option>
            <option value="mac-x64">macOS — Intel (x86_64)</option>
            <option value="linux-x64">Linux Workstation (x86_64)</option>
          </select>
        </div>

        {/* RAM Selector */}
        <div className="checker-group">
          <div className="checker-group-header">
            <label htmlFor={ramInputId} className="checker-label">System Memory (RAM)</label>
            <span className="checker-hint" style={{ color: "var(--accent-light)", fontWeight: 600 }}>{ram} GB</span>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              id={ramInputId}
              type="range"
              min="8"
              max="128"
              step="4"
              value={ram}
              onChange={(e) => {
                setActivePreset("");
                setRam(Number(e.target.value));
              }}
              style={{ flex: 1, accentColor: "#a855f7" }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-subtle)", fontFamily: "var(--mono)" }}>
            <span>8 GB (Min)</span>
            <span>16 GB (Baseline)</span>
            <span>32 GB (Optimal)</span>
            <span>64 GB+ (Heavy)</span>
          </div>
        </div>

        {/* Processor / CPU */}
        <div className="checker-group">
          <div className="checker-group-header">
            <label htmlFor={cpuSelectId} className="checker-label">Processor / CPU Family</label>
            <span className="checker-hint">CPU</span>
          </div>
          <select
            id={cpuSelectId}
            className="checker-select"
            value={cpu}
            onChange={(e) => {
              setActivePreset("");
              setCpu(e.target.value as CpuType);
            }}
          >
            {isAppleSilicon ? (
              <>
                <option value="apple-m4">Apple M4 / M4 Pro / M4 Max</option>
                <option value="apple-m3">Apple M3 / M3 Pro / M3 Max</option>
                <option value="apple-m2">Apple M2 / M2 Pro / M2 Max / M2 Ultra</option>
                <option value="apple-m1">Apple M1 / M1 Pro / M1 Max / M1 Ultra</option>
              </>
            ) : (
              <>
                <option value="intel-13-14">Intel Core 13th / 14th Gen (e.g. i7-13700H, i9-14900K)</option>
                <option value="intel-10-12">Intel Core 10th - 12th Gen (e.g. i7-11800H, i7-12700K)</option>
                <option value="amd-zen4-5">AMD Ryzen 7000 / 9000 Series (Zen 4 / Zen 5)</option>
                <option value="amd-zen2-3">AMD Ryzen 3000 / 5000 Series (Zen 2 / Zen 3)</option>
              </>
            )}
          </select>
        </div>

        {/* GPU / Graphics Acceleration */}
        <div className="checker-group">
          <div className="checker-group-header">
            <label htmlFor={gpuSelectId} className="checker-label">Graphics &amp; Compute Acceleration</label>
            <span className="checker-hint">GPU</span>
          </div>
          <select
            id={gpuSelectId}
            className="checker-select"
            value={gpu}
            onChange={(e) => {
              setActivePreset("");
              setGpu(e.target.value as GpuType);
            }}
          >
            {isAppleSilicon ? (
              <option value="apple-metal">Apple Integrated Metal GPU (Unified Memory)</option>
            ) : (
              <>
                <option value="nvidia-high">NVIDIA GeForce RTX 4080 / 4090 / 3090 (16GB - 24GB VRAM)</option>
                <option value="nvidia-mid">NVIDIA GeForce RTX 4070 / 3080 / 3070 (10GB - 12GB VRAM)</option>
                <option value="nvidia-entry">NVIDIA GeForce RTX 4060 / 3060 (6GB - 8GB VRAM)</option>
                <option value="amd-radeon">AMD Radeon RX 6000 / 7000 Series (ROCm / Vulkan)</option>
                <option value="integrated">Integrated Graphics / CPU Only (Intel Iris Xe / AMD UHD)</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Real-Time Diagnostic Output */}
      <div className="diagnostic-card">
        <div className="diagnostic-header">
          <div className="diagnostic-status-row">
            <span className={`diagnostic-status-badge ${statusClass}`}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
              {statusLabel}
            </span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-subtle)" }}>
              Score: {scorePercent}/100
            </span>
          </div>

          <div className="meter-track">
            <div className="meter-bar" style={{ width: `${scorePercent}%` }} />
          </div>
        </div>

        {/* Speed Banner */}
        <div className="diagnostic-speed-display">
          <span className="diagnostic-speed-label">ESTIMATED LOCAL INFERENCE SPEED</span>
          <span className="diagnostic-speed-number">{speedText}</span>
          <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
            Zero latency over network; streaming begins in &lt;150ms.
          </span>
        </div>

        {/* Technical Metric Specs */}
        <div className="diagnostic-metrics-list">
          <div className="diagnostic-metric-row">
            <span className="diagnostic-metric-key">Acceleration Engine:</span>
            <span className="diagnostic-metric-val">{accelerationEngine}</span>
          </div>

          <div className="diagnostic-metric-row">
            <span className="diagnostic-metric-key">Recommended Model:</span>
            <span className="diagnostic-metric-val">{recommendedModel}</span>
          </div>

          <div className="diagnostic-metric-row">
            <span className="diagnostic-metric-key">Context Window Limit:</span>
            <span className="diagnostic-metric-val">{contextLimit}</span>
          </div>

          <div className="diagnostic-metric-row">
            <span className="diagnostic-metric-key">Memory Allocation:</span>
            <span className="diagnostic-metric-val">{memoryBreakdown}</span>
          </div>
        </div>

        {/* Verdict Callout */}
        <div className="diagnostic-verdict-box">
          <strong style={{ color: "var(--text)", display: "block", marginBottom: 4 }}>System Verdict:</strong>
          {verdict}
        </div>

        {/* Direct Action Links */}
        <div className="diagnostic-actions">
          <Link className="btn btn-primary" href="/products" style={{ textAlign: "center" }}>
            Get Veyrith Code for Your System
          </Link>
          <Link className="btn btn-secondary" href="/about" style={{ textAlign: "center" }}>
            Inspect Architecture &amp; Benchmarks
          </Link>
        </div>
      </div>
    </div>
  );
}

