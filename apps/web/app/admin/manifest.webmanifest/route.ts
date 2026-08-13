const basePath = process.env.NEXT_BASE_PATH ?? "";
const adminPath = `${basePath}/admin`;

export function GET() {
  return new Response(
    JSON.stringify({
      id: adminPath,
      name: "Дымоход Трейд — Админка",
      short_name: "Админка",
      description: "Управление каталогом Дымоход Трейд.",
      start_url: adminPath,
      scope: adminPath,
      display: "standalone",
      prefer_related_applications: false,
      background_color: "#102127",
      theme_color: "#ed5b2a",
      lang: "ru",
      categories: ["business"],
      icons: [
        {
          src: `${basePath}/brand/admin-icon-192.png`,
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: `${basePath}/brand/admin-icon-512.png`,
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: `${basePath}/brand/admin-icon-512.png`,
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    }),
    {
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "application/manifest+json; charset=utf-8",
      },
    },
  );
}
