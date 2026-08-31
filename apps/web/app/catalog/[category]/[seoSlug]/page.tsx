import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogCategoryView } from "@/components/CatalogCategoryView";
import { getCatalogCategoryBySlug } from "@/lib/catalogCategories";
import { hasCatalogQuery, type CatalogSearchParams } from "@/lib/catalogFilters";
import {
  catalogSeoPagePath,
  getCatalogSeoPage,
} from "@/lib/catalogSeoPages";

export const dynamic = "force-dynamic";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dimohod-trade.pro";
const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type CatalogSeoPageProps = {
  params: Promise<{ category: string; seoSlug: string }>;
  searchParams: Promise<CatalogSearchParams>;
};

function absoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(`${appBasePath}${path}`, appUrl).toString();
}

export async function generateMetadata({ params, searchParams }: CatalogSeoPageProps): Promise<Metadata> {
  const [{ category, seoSlug }, query] = await Promise.all([params, searchParams]);
  const page = getCatalogSeoPage(category, seoSlug);
  if (!page) {
    return {
      title: "Подборка не найдена | Дымоход Трейд",
      robots: { index: false, follow: false },
    };
  }

  const categoryData = await getCatalogCategoryBySlug(category);
  if (!categoryData) {
    return {
      title: "Категория не найдена | Дымоход Трейд",
      robots: { index: false, follow: false },
    };
  }

  const canonical = absoluteUrl(catalogSeoPagePath(page));
  const image = categoryData.cover?.url ? absoluteUrl(categoryData.cover.url) : undefined;
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical },
    robots: hasCatalogQuery(query)
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: "ru_RU",
      title: page.title,
      description: page.description,
      url: canonical,
      images: image ? [{ url: image, alt: page.h1 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function CatalogSeoLanding({ params }: CatalogSeoPageProps) {
  const { category, seoSlug } = await params;
  const page = getCatalogSeoPage(category, seoSlug);
  if (!page) notFound();

  const categoryData = await getCatalogCategoryBySlug(category);
  if (!categoryData) notFound();

  return <CatalogCategoryView category={categoryData} filters={page.filters} seoPage={page} />;
}
