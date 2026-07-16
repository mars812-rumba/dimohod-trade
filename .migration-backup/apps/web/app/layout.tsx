import type { Metadata } from "next";
import Link from "next/link";
import { Flame, Search, ShoppingCart } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dimohod Trade",
  description: "Каталог и калькулятор дымоходных систем.",
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
              <Flame size={18} strokeWidth={2.2} />
            </span>
            <span>Dimohod Trade</span>
          </Link>
          <nav className="top-nav" aria-label="Основная навигация">
            <Link href="/catalog">Каталог</Link>
            <button type="button" aria-label="Поиск" title="Поиск">
              <Search size={18} />
            </button>
            <button type="button" aria-label="Корзина" title="Корзина">
              <ShoppingCart size={18} />
            </button>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
