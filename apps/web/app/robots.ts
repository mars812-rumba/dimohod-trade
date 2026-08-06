import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dimohod-trade.pro";
const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function absoluteUrl(path: string) {
  return new URL(`${appBasePath}${path}`, appUrl).toString();
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [`${appBasePath}/admin`],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: new URL(appUrl).origin,
  };
}
