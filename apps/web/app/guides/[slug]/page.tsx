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
      publishedTime: article.publishedAt,
      modifiedTime: article.modifiedAt,
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

  const origin = new URL(siteUrl).origin;
  const canonical = new URL(`/guides/${article.slug}`, origin).toString();
  const image = new URL(article.image, origin).toString();
  const articleId = `${canonical}#article`;
  const webPageId = `${canonical}#webpage`;
  const breadcrumbId = `${canonical}#breadcrumb`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": articleId,
        headline: article.title,
        description: article.description,
        image: [image],
        datePublished: article.publishedAt,
        dateModified: article.modifiedAt,
        inLanguage: "ru-RU",
        mainEntityOfPage: { "@id": webPageId },
        author: {
          "@type": "Organization",
          "@id": `${origin}/#organization`,
          name: "Дымоход Трейд",
          url: `${origin}/`,
        },
        publisher: { "@id": `${origin}/#organization` },
      },
      {
        "@type": "WebPage",
        "@id": webPageId,
        url: canonical,
        name: article.title,
        description: article.description,
        inLanguage: "ru-RU",
        isPartOf: { "@id": `${origin}/#website` },
        breadcrumb: { "@id": breadcrumbId },
        primaryImageOfPage: { "@type": "ImageObject", url: image, caption: article.imageAlt },
        mainEntity: { "@id": articleId },
      },
      {
        "@type": "BreadcrumbList",
        "@id": breadcrumbId,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Главная", item: `${origin}/` },
          { "@type": "ListItem", position: 2, name: "Статьи", item: `${origin}/guides` },
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
