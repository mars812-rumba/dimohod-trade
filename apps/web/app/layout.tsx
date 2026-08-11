import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { SiteHeader } from "../components/SiteHeader";
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
              window.__dimohodInstallPromptPath = window.location.pathname;
              window.dispatchEvent(new Event("dimohod:pwa-install-ready"));
            });
            if ("serviceWorker" in navigator) {
              navigator.serviceWorker.register(${JSON.stringify(`${basePath}/sw.js`)}).catch(function () {});
            }
          })();
        `}
      </Script>
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
