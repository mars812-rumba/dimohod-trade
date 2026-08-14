import type { Metadata } from "next";
import Link from "next/link";
import { BanyaIntakeFlow } from "@/components/BanyaIntakeFlow";
import styles from "@/components/ScenarioPageTemplate.module.css";
import { banyaScenario } from "@/lib/scenarioPages";

const assetBasePath = process.env.NEXT_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Замеры для расчёта дымохода в бане — Дымоход Трейд",
  description: "Подготовьте и сохраните в браузере размеры печи, патрубка, здания и выбранной трассы для дальнейшего расчёта дымохода.",
  alternates: {
    canonical: "/solutions/banya/zamery",
  },
  openGraph: {
    type: "website",
    url: "/solutions/banya/zamery",
    title: "Замеры для расчёта дымохода в бане",
    description: "Пошаговая подготовка размеров печи, патрубка, здания и выбранной трассы для дальнейшего расчёта дымохода.",
    images: [
      {
        url: "/images/measurements/stove-outlet-diameter-mobile.webp",
        width: 1024,
        height: 1536,
        alt: "Схема наружного замера патрубка банной печи",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Замеры для расчёта дымохода в бане",
    description: "Пошаговая подготовка размеров для расчёта дымохода в бане.",
    images: ["/images/measurements/stove-outlet-diameter-mobile.webp"],
  },
};

type BanyaMeasurementsPageProps = {
  searchParams: Promise<{
    profile?: string | string[];
    route?: string | string[];
  }>;
};

export default async function BanyaMeasurementsPage({ searchParams }: BanyaMeasurementsPageProps) {
  const params = await searchParams;
  const initialProfileId = typeof params.profile === "string" ? params.profile : "";
  const initialRoute = typeof params.route === "string" ? params.route : "";

  return (
    <main className={styles.main}>
      <div className={styles.shell}>
        <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span aria-hidden>/</span>
          <Link href="/solutions/banya">Баня</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">Замеры</span>
        </nav>
      </div>

      <header className={styles.measurementsPageHeader}>
        <div className={styles.shell}>
          <h1>Замеры для расчёта дымохода в бане</h1>
          <p>
            Соберите известные размеры, сохраните их под понятным названием и затем откройте профиль
            в конфигураторе. Для другого маршрута можно создать отдельный вариант на основе тех же данных.
          </p>
          <Link href="/solutions/banya">Вернуться к вариантам трассы</Link>
        </div>
      </header>

      <BanyaIntakeFlow
        content={banyaScenario}
        assetBasePath={assetBasePath}
        initialProfileId={initialProfileId}
        initialRoute={initialRoute}
      />
    </main>
  );
}
