import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { StoveCatalogPage } from "@/components/StoveCatalogPage";
import {
  isValidStovePage,
  stovePageCount,
  stovePagePath,
  stovesForPage,
} from "@/lib/stoves";

type StovePaginationPageProps = {
  params: Promise<{ page: string }>;
};

export const dynamicParams = false;

function pageNumber(value: string) {
  return /^\d+$/.test(value) ? Number(value) : Number.NaN;
}

export function generateStaticParams() {
  return Array.from({ length: stovePageCount - 1 }, (_, index) => ({
    page: String(index + 2),
  }));
}

export async function generateMetadata({ params }: StovePaginationPageProps): Promise<Metadata> {
  const page = pageNumber((await params).page);
  if (!isValidStovePage(page) || page === 1) {
    return { title: "Страница печей не найдена | Дымоход Трейд", robots: { index: false } };
  }
  const firstStove = stovesForPage(page)[0];
  const title = `Печи для бани — страница ${page} из ${stovePageCount} | Дымоход Трейд`;
  const description = `Модели банных печей с фотографиями: страница ${page} из ${stovePageCount}. Справочный каталог перед расчётом дымохода.`;
  const canonical = stovePagePath(page);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "ru_RU",
      url: canonical,
      title,
      description,
      images: firstStove ? [{ url: firstStove.image, alt: firstStove.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: firstStove ? [firstStove.image] : undefined,
    },
  };
}

export default async function PaginatedStovesPage({ params }: StovePaginationPageProps) {
  const page = pageNumber((await params).page);
  if (page === 1) redirect("/pechi");
  if (!isValidStovePage(page)) notFound();
  return <StoveCatalogPage page={page} />;
}
