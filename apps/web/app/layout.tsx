import type { Metadata } from "next";
import Link from "next/link";
import { Flame, Phone, Search, ShoppingCart } from "lucide-react";
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
