import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogCategoryView } from "@/components/CatalogCategoryView";
import { getCatalogCategoryBySlug } from "@/lib/catalogCategories";
import {
  catalogCategoryPath,
  hasCatalogQuery,
  parseCatalogFilters,
  type CatalogSearchParams,
} from "@/lib/catalogFilters";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dimohod-trade.pro";
const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type CategoryPageProps = {
  params: Promise<{ category: string }>;
  searchParams: Promise<CatalogSearchParams>;
};

function absoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(`${appBasePath}${path}`, appUrl).toString();
}

export async function generateMetadata({ params, searchParams }: CategoryPageProps): Promise<Metadata> {
  const [{ category: slug }, query] = await Promise.all([params, searchParams]);
  const category = await getCatalogCategoryBySlug(slug);
  if (!category) {
    return {
      title: "Категория не найдена | Дымоход Трейд",
      robots: { index: false, follow: false },
    };
  }

  const title = `${category.name} — купить | Дымоход Трейд`;
  const description = category.description
    ?? `${category.name}: выбор изделий по диаметру, материалу и марке стали в каталоге Дымоход Трейд.`;
  const canonical = absoluteUrl(catalogCategoryPath(category.slug));
  const image = category.cover?.url ? absoluteUrl(category.cover.url) : undefined;
  return {
    title,
    description,
    alternates: { canonical },
    robots: hasCatalogQuery(query)
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: "ru_RU",
      title,
      description,
      url: canonical,
      images: image ? [{ url: image, alt: category.cover?.alt ?? category.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const [{ category: slug }, rawQuery] = await Promise.all([params, searchParams]);
  const category = await getCatalogCategoryBySlug(slug);
  if (!category) notFound();

  return (
    <CatalogCategoryView
      category={category}
      filters={parseCatalogFilters(rawQuery)}
      hasQuery={hasCatalogQuery(rawQuery)}
    />
  );
}
