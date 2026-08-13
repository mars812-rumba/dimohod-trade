import type { Metadata } from "next";

const basePath = process.env.NEXT_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Дымоход Трейд — Админка",
  description: "Управление каталогом Дымоход Трейд.",
  manifest: `${basePath}/admin/manifest.webmanifest`,
  icons: {
    icon: [
      {
        url: `${basePath}/brand/admin-icon-32.png`,
        sizes: "32x32",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: `${basePath}/brand/admin-icon-180.png`,
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
