import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Script from "next/script";
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
      <Script id="pwa-install-bootstrap" strategy="beforeInteractive">
        {`
          (function () {
            window.addEventListener("beforeinstallprompt", function (event) {
              event.preventDefault();
              window.__dimohodInstallPrompt = event;
              window.dispatchEvent(new Event("dimohod:pwa-install-ready"));
            });
            if ("serviceWorker" in navigator) {
              navigator.serviceWorker.register(${JSON.stringify(`${basePath}/sw.js`)}).catch(function () {});
            }
          })();
        `}
      </Script>
      <body>
        <header className="site-header">
          <Link href="/" className="brand" aria-label="Dimohod Trade">
            <img
              alt=""
              className="brand-logo"
              height="51"
              src={`${basePath}/brand/logo-original.jpg`}
              width="112"
            />
          </Link>
          <nav className="top-nav" aria-label="Основная навигация">
            <Link href="/catalog">Каталог</Link>
            <Link href="/catalog?scenario=banya">Для бани</Link>
            <Link href="/catalog?scenario=kamin">Для камина</Link>
            <Link href="/catalog?scenario=gaz">Для газа</Link>
          </nav>
          <div className="header-right">
            <InstallAppButton />
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
