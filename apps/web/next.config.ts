import type { NextConfig } from "next";

const basePath = process.env.NEXT_BASE_PATH || "";
const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["178.236.16.63", "sunny-rentals.online"],
  basePath,
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiBaseUrl}/api/:path*`,
      },
      {
        source: "/media/:path*",
        destination: `${apiBaseUrl}/media/:path*`,
      },
    ];
  },
};

export default nextConfig;
