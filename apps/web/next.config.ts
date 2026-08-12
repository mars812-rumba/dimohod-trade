import type { NextConfig } from "next";

const basePath = process.env.NEXT_BASE_PATH || "";
const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["178.236.16.63", "sunny-rentals.online"],
  basePath,
  reactStrictMode: true,
  async headers() {
    const imageCacheHeaders = [
      {
        key: "Cache-Control",
        value: "public, max-age=2592000, stale-while-revalidate=86400",
      },
    ];
    return [
      { source: "/images/:path*", headers: imageCacheHeaders },
      { source: "/brand/:path*", headers: imageCacheHeaders },
    ];
  },
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
