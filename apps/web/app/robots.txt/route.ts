const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dimohod-trade.pro";
const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function publicPath(path: string) {
  return `${appBasePath}${path}` || "/";
}

export function GET() {
  const origin = new URL(appUrl).origin;
  const lines = [
    "User-agent: *",
    "Allow: /",
    `Disallow: ${publicPath("/admin")}`,
    "Clean-param: utm_source&utm_medium&utm_campaign&utm_content&utm_term&yclid&ysclid&gclid",
    `Clean-param: diameter&inner_pipe&inner_thickness&outer_pipe&execution&length&page ${publicPath("/catalog/")}`,
    `Clean-param: sku&length ${publicPath("/product/")}`,
    `Clean-param: profile&route&object&edit ${publicPath("/configurator")}`,
    `Sitemap: ${new URL(`${appBasePath}/sitemap.xml`, origin).toString()}`,
    `Host: ${origin}`,
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Type": "text/plain; charset=utf-8",
    },
    status: 200,
  });
}
