import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Phone, Search, ShoppingCart } from "lucide-react";
import { InstallAppButton } from "../components/InstallAppButton";
import "./globals.css";

const basePath = process.env.NEXT_BASE_PATH ?? "";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://dimohod-trade.pro"),
  title: "Dimohod Trade",
  description: "Каталог и калькулятор дымоходных систем.",
  manifest: `${basePath}/manifest.webmanifest`,
  icons: {
    icon: [
      { url: `${basePath}/brand/logo-mark.svg`, type: "image/svg+xml" },
      { url: `${basePath}/brand/app-icon-192.png`, sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: `${basePath}/brand/apple-touch-icon.png`, sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#102127",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <header className="site-header">
          <Link href="/" className="brand" aria-label="Dimohod Trade">
            <span className="brand-mark">
              <img alt="" height="38" src={`${basePath}/brand/logo-mark.svg`} width="38" />
            </span>
            <span className="brand-name">
              <span className="brand-name-top">Дымоход Трейд</span>
              <span className="brand-name-sub">системы дымоходов</span>
            </span>
          </Link>
          <nav className="top-nav" aria-label="Основная навигация">
            <Link href="/catalog">Каталог</Link>
            <Link href="/catalog?scenario=banya">Для бани</Link>
            <Link href="/catalog?scenario=kamin">Для камина</Link>
            <Link href="/catalog?scenario=gaz">Для газа</Link>
          </nav>
          <div className="header-right">
            <InstallAppButton basePath={basePath} />
            <a href="tel:+79650756555" className="header-phone">
              <Phone size={15} /> +7 (965) 075-65-55
            </a>
            <button type="button" className="icon-button" aria-label="Поиск" title="Поиск">
              <Search size={18} />
            </button>
            <button type="button" className="icon-button" aria-label="Корзина" title="Корзина">
              <ShoppingCart size={18} />
            </button>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
