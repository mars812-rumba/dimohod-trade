import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SolutionHouseGallery } from "@/components/SolutionHouseGallery";
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

const houseGalleryImages = [
  {
    src: `${assetBasePath}/images/home/scenario-dom-dark-user.webp`,
    alt: "Частный дом с несколькими кровельными дымоходами",
  },
  {
    src: `${assetBasePath}/images/solutions/dom/house-chimney-full.webp`,
    alt: "Полный вид печи и дымохода до потолочного прохода",
  },
  {
    src: `${assetBasePath}/images/solutions/dom/house-stove-close.webp`,
    alt: "Печь с огнём и подключённым дымоходом",
  },
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
      <section className={`${styles.routeSection} ${styles.solutionsSection}`}>
        <div className={styles.shell}>
          <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
            <Link href="/">Главная</Link>
            <span aria-hidden>/</span>
            <span aria-current="page">Решения</span>
          </nav>

          <header className={styles.solutionsIntro}>
            <h1>Выберите сценарий подбора дымохода</h1>
            <p>
              Начните с объекта или отопителя. Неизвестные данные можно
              добавить позже.
            </p>
          </header>

          <div className={styles.routeGrid}>
            {scenarios.map((scenario) => {
              if (scenario.slug === "dom") {
                return (
                  <article className={styles.routeOption} key={scenario.slug}>
                    <SolutionHouseGallery images={houseGalleryImages} />
                    <div>
                      <h2>{scenario.eyebrow}</h2>
                      <p>{scenario.summary}</p>
                      <Link
                        className={styles.routeOptionAction}
                        href={`/solutions/${scenario.slug}`}
                      >
                        Открыть сценарий <ArrowRight size={15} aria-hidden />
                      </Link>
                    </div>
                  </article>
                );
              }

              return (
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
                    <h2>{scenario.eyebrow}</h2>
                    <p>{scenario.summary}</p>
                    <span>
                      Открыть сценарий <ArrowRight size={15} aria-hidden />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.solutionsArticleSection}>
        <div className={styles.shell}>
          <article className={styles.solutionsArticle}>
            <h2>Как выбрать сценарий</h2>
            <div className={styles.solutionsArticleBody}>
              <p>
                Выберите то, что вам уже известно: тип объекта или конкретный
                отопитель. На следующем шаге можно указать модель оборудования,
                расположение патрубка, предполагаемый маршрут дымохода и
                известные размеры.
              </p>
              <h3>Если данных пока не хватает</h3>
              <p>
                Начните с известных параметров, а недостающие отметьте для
                уточнения. Подсказки на сценарной странице помогут подготовить
                замеры, после чего состав системы можно передать специалисту на
                проверку.
              </p>
              <p>
                Если вы уже знаете нужные изделия, перейдите сразу в{" "}
                <Link href="/catalog">каталог дымоходов и комплектующих</Link>.
              </p>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
