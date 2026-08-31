import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { IconArrowRight as ArrowRight } from "@tabler/icons-react";
import { guideArticles, guideConfiguratorHref } from "@/lib/guideArticles";
import styles from "./page.module.css";

const assetBasePath = process.env.NEXT_BASE_PATH ?? "";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dimohod-trade.pro";
const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Статьи о подборе и маршрутах дымохода — Дымоход Трейд",
  description:
    "Практические статьи о дымоходах для бани и печи, проходах через стену и кровлю, а также комплекте с тройником 90°. Ссылки на конфигуратор.",
  alternates: { canonical: "/guides" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "/guides",
    title: "Практические статьи о дымоходах",
    description: "Пять сценариев, исходные данные и переход к расчёту комплекта.",
    images: [{
      url: guideArticles[0].image,
      width: 1672,
      height: 941,
      alt: guideArticles[0].imageAlt,
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Практические статьи о дымоходах",
    description: "Пять сценариев, исходные данные и переход к расчёту комплекта.",
    images: [guideArticles[0].image],
  },
};

export default function GuidesPage() {
  const origin = new URL(appUrl).origin;
  const absoluteUrl = (path: string) => new URL(`${appBasePath}${path}`, origin).toString();
  const canonicalUrl = absoluteUrl("/guides");
  const breadcrumbId = `${canonicalUrl}#breadcrumb`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: "Статьи о подборе и маршрутах дымохода",
        description:
          "Практические статьи о дымоходах для бани и печи, проходах через стену и кровлю.",
        inLanguage: "ru-RU",
        isPartOf: { "@id": `${origin}/#website` },
        breadcrumb: { "@id": breadcrumbId },
        mainEntity: { "@id": `${canonicalUrl}#articles` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": breadcrumbId,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Главная", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Статьи", item: canonicalUrl },
        ],
      },
      {
        "@type": "ItemList",
        "@id": `${canonicalUrl}#articles`,
        numberOfItems: guideArticles.length,
        itemListElement: guideArticles.map((article, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: article.shortTitle,
          url: absoluteUrl(`/guides/${article.slug}`),
        })),
      },
    ],
  };

  return (
    <>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        type="application/ld+json"
      />
      <main className={styles.main}>
      <div className={styles.shell}>
        <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
          <Link href="/">Главная</Link><span aria-hidden>/</span><span aria-current="page">Статьи</span>
        </nav>
        <header className={styles.header}>
          <p>База знаний</p>
          <h1>Разберите маршрут до выбора деталей</h1>
          <div>
            <p>
              Пять практических сценариев: что измерить, что проверить в паспорте и как перейти
              от идеи к предварительной спецификации без универсальных обещаний.
            </p>
            <Link href={guideConfiguratorHref}>Перейти в конфигуратор <ArrowRight size={18} aria-hidden /></Link>
          </div>
        </header>

        <section className={styles.grid} aria-label="Статьи о дымоходах">
          {guideArticles.map((article, index) => (
            <article className={`${styles.card} ${index === 0 ? styles.featured : ""}`} key={article.slug}>
              <Link className={styles.image} href={`/guides/${article.slug}`}>
                <Image
                  alt={article.imageAlt}
                  fill
                  sizes={index === 0 ? "(max-width: 760px) 100vw, 65vw" : "(max-width: 760px) 100vw, 33vw"}
                  src={`${assetBasePath}${article.image}`}
                />
                <span>{article.imageCaption ?? "Концептуальная визуализация"}</span>
              </Link>
              <div className={styles.cardBody}>
                <p>{article.eyebrow} · {article.readingTime}</p>
                <h2><Link href={`/guides/${article.slug}`}>{article.shortTitle}</Link></h2>
                <p>{article.description}</p>
                <Link className={styles.readLink} href={`/guides/${article.slug}`}>
                  Читать статью <ArrowRight size={17} aria-hidden />
                </Link>
              </div>
            </article>
          ))}
        </section>
      </div>
      </main>
    </>
  );
}
