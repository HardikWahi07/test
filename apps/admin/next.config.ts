import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
import type { NextConfig } from "next";

loadDotenv({ path: resolve(process.cwd(), "../../.env") });

const nextConfig: NextConfig = {
  transpilePackages: ["@veyrith/core"],
};

export default nextConfig;
