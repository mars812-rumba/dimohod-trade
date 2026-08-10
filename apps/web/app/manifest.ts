import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: ".",
    name: "Дымоход Трейд",
    short_name: "Дымоход",
    description: "Каталог и подбор совместимой дымоходной системы.",
    start_url: ".",
    scope: ".",
    display: "standalone",
    background_color: "#f1f4f4",
    theme_color: "#102127",
    lang: "ru",
    categories: ["business", "shopping"],
    icons: [
      {
        src: "brand/app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "brand/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "brand/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
