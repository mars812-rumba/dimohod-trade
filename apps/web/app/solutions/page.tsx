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

const scenarioCardImages: Record<string, string> = {
  dom: "/images/home/solution-card-dom-user.webp",
};

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
      <section className={styles.routeSection}>
        <div className={styles.shell}>
          <h1 className={styles.visuallyHidden}>Сценарии подбора дымохода</h1>
          <div className={styles.routeGrid}>
            {scenarios.map((scenario) => (
              <Link
                className={styles.routeOption}
                href={`/solutions/${scenario.slug}`}
                key={scenario.slug}
              >
                <div className={styles.routeImage}>
                  <Image
                    src={`${assetBasePath}${scenarioCardImages[scenario.slug] ?? scenario.heroImage}`}
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
