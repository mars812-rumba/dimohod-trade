const basePath = process.env.NEXT_BASE_PATH ?? "";

export function GET() {
  return new Response(
    JSON.stringify({
      id: `${basePath}/`,
      name: "Дымоход Трейд",
      short_name: "Дымоход",
      description: "Каталог и подбор совместимой дымоходной системы.",
      start_url: `${basePath}/`,
      scope: `${basePath}/`,
      display: "standalone",
      prefer_related_applications: false,
      background_color: "#f1f4f4",
      theme_color: "#102127",
      lang: "ru",
      categories: ["business", "shopping"],
      icons: [
        {
          src: `${basePath}/brand/app-icon-192.png`,
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: `${basePath}/brand/app-icon-512.png`,
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: `${basePath}/brand/app-icon-512.png`,
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
