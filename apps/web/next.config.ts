import type { NextConfig } from "next";

const basePath = process.env.NEXT_BASE_PATH || "";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["178.236.16.63", "sunny-rentals.online"],
  basePath,
  reactStrictMode: true,
};

export default nextConfig;
