import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuideArticlePage } from "@/components/GuideArticlePage";
import { guideArticleBySlug, guideArticles } from "@/lib/guideArticles";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dimohod-trade.pro";

type GuidePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return guideArticles.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = guideArticleBySlug[slug];
  if (!article) return {};
  const path = `/guides/${article.slug}`;

  return {
    title: `${article.title} — Дымоход Трейд`,
    description: article.description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      locale: "ru_RU",
      url: path,
      title: article.title,
      description: article.description,
      publishedTime: "2026-08-22T12:00:00Z",
      modifiedTime: "2026-08-22T12:00:00Z",
      images: [{ url: article.image, width: 1672, height: 941, alt: article.imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
      images: [article.image],
    },
  };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const article = guideArticleBySlug[slug];
  if (!article) notFound();

  const canonical = new URL(`/guides/${article.slug}`, siteUrl).toString();
  const image = new URL(article.image, siteUrl).toString();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${canonical}#article`,
        headline: article.title,
        description: article.description,
        image: [image],
        datePublished: "2026-08-22T12:00:00Z",
        dateModified: "2026-08-22T12:00:00Z",
        inLanguage: "ru-RU",
        mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
        author: {
          "@type": "Organization",
          "@id": `${siteUrl}/#organization`,
          name: "Дымоход Трейд",
          url: siteUrl,
        },
        publisher: { "@id": `${siteUrl}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Главная", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Статьи", item: `${siteUrl}/guides` },
          { "@type": "ListItem", position: 3, name: article.shortTitle, item: canonical },
        ],
      },
    ],
  };

  return (
    <>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        type="application/ld+json"
      />
      <GuideArticlePage article={article} />
    </>
  );
}
