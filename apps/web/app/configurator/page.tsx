import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  IconArrowLeft as ArrowLeft,
  IconRuler as Ruler,
} from "@tabler/icons-react";
import { ChimneyConfigurator } from "@/components/ChimneyConfigurator";
import styles from "./page.module.css";

const assetBasePath = process.env.NEXT_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Конфигуратор дымохода — расчёт комплекта | Дымоход Трейд",
  description:
    "Откройте сохранённые замеры и получите предварительную схему, состав комплекта дымохода и PDF-смету для проверки специалистом.",
  alternates: { canonical: "/configurator" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "/configurator",
    title: "Конфигуратор дымохода — Дымоход Трейд",
    description: "Предварительная схема, состав комплекта и PDF-смета по сохранённым замерам.",
    images: [{
      url: "/images/home/hero-projects/log-house-facade.webp",
      width: 1600,
      height: 900,
      alt: "Наружный маршрут дымохода по фасаду дома",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Конфигуратор дымохода — Дымоход Трейд",
    description: "Предварительная схема, состав комплекта и PDF-смета по сохранённым замерам.",
    images: ["/images/home/hero-projects/log-house-facade.webp"],
  },
};

export default function ConfiguratorPage() {
  return (
    <main className={styles.main}>
      <div className={styles.shell}>
        <nav aria-label="Хлебные крошки" className={styles.breadcrumbs}>
          <Link href="/">Главная</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">Конфигуратор</span>
        </nav>

        <header className={styles.header}>
          <div>
            <p className={styles.overline}>Расчёт по вашим замерам</p>
            <h1>Конфигуратор дымохода</h1>
            <p>
              Откройте сохранённый замер, чтобы получить предварительную SVG-схему,
              состав комплекта и PDF-смету для последующей проверки специалистом.
            </p>
          </div>
          <div className={styles.headerActions}>
            <Link className={styles.secondaryAction} href="/zamery">
              <Ruler aria-hidden size={18} />
              Мои замеры
            </Link>
            <Link className={styles.textAction} href="/solutions">
              <ArrowLeft aria-hidden size={17} />
              Выбрать другую задачу
            </Link>
          </div>
        </header>

        <section aria-label="Расчёт комплекта дымохода" className={styles.workspace}>
          <Suspense fallback={<div className={styles.fallback} role="status">Загружаем конфигуратор…</div>}>
            <ChimneyConfigurator assetBasePath={assetBasePath} />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
