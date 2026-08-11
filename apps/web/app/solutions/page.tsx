import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { scenarioPages } from "@/lib/scenarioPages";
import styles from "@/components/ScenarioPageTemplate.module.css";

const assetBasePath = process.env.NEXT_BASE_PATH ?? "";
const scenarioOrder = [
  "dom",
  "banya",
  "pech",
  "kamin",
  "tverdotoplivny-kotel",
  "gazovyy-kotel",
];

export const metadata: Metadata = {
  title: "Подбор дымохода по отопителю и объекту",
  description:
    "Выберите баню, дом, печь, камин или котёл. Соберите исходные данные и перейдите к сценарию подбора дымохода для проверки специалистом.",
  alternates: {
    canonical: "/solutions",
  },
  openGraph: {
    type: "website",
    url: "/solutions",
    title: "Подбор дымохода по отопителю и объекту",
    description:
      "Сценарии подбора дымохода для бани, дома, печи, камина и котлов.",
    images: [
      {
        url: "/images/home/hero-photo-720.webp",
        width: 720,
        height: 1280,
        alt: "Металлический дымоход на фасаде частного дома",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Подбор дымохода по отопителю и объекту",
    description: "Выберите свой объект и источник тепла, чтобы начать подбор.",
    images: ["/images/home/hero-photo-720.webp"],
  },
};

export default function SolutionsPage() {
  const scenarios = scenarioOrder.map((slug) => scenarioPages[slug]);

  return (
    <main className={styles.main}>
      <div className={styles.shell}>
        <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">Решения</span>
        </nav>
      </div>

      <section className={styles.hero}>
        <div className={`${styles.shell} ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Сценарии подбора</p>
            <h1>Начните с объекта и вашего отопителя</h1>
            <p className={styles.heroSummary}>
              Каждая страница собирает свой набор исходных данных и ведёт к черновому расчёту без
              универсальных технических предположений.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href="/solutions/dom">
                Выбрать для дома
                <ArrowRight size={18} aria-hidden />
              </Link>
              <Link className={styles.secondaryButton} href="/solutions/banya">
                Выбрать для бани
              </Link>
            </div>
          </div>

          <div className={styles.heroMedia}>
            <Image
              src={`${assetBasePath}/images/home/hero-photo-720.webp`}
              alt="Металлический дымоход на фасаде частного дома"
              fill
              priority
              fetchPriority="high"
              quality={78}
              sizes="(max-width: 820px) 100vw, 46vw"
            />
          </div>
        </div>
      </section>

      <section className={styles.routeSection}>
        <div className={styles.shell}>
          <div className={styles.sectionIntro}>
            <h2>Выберите свою ситуацию</h2>
            <p>Если точной модели оборудования пока нет, начните с объекта и подготовьте план.</p>
          </div>
          <div className={styles.routeGrid}>
            {scenarios.map((scenario) => (
              <Link
                className={styles.routeOption}
                href={`/solutions/${scenario.slug}`}
                key={scenario.slug}
              >
                <div className={styles.routeImage}>
                  <Image
                    src={`${assetBasePath}${scenario.heroImage}`}
                    alt=""
                    fill
                    loading="lazy"
                    quality={72}
                    sizes="(max-width: 620px) calc(100vw - 32px), (max-width: 820px) 50vw, 540px"
                  />
                </div>
                <div>
                  <h3>{scenario.eyebrow}</h3>
                  <p>{scenario.summary}</p>
                  <span>
                    Открыть сценарий <ArrowRight size={15} aria-hidden />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
