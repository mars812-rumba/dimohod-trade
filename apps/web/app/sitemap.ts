import type { MetadataRoute } from "next";
import { getCatalogTree, getProductSeoPages, type CategoryNode } from "@/lib/api";
import { productPublicPath } from "@/lib/productUrls";
import { scenarioPages } from "@/lib/scenarioPages";
import { guideArticles } from "@/lib/guideArticles";
import { stovePageCount, stovePagePath } from "@/lib/stoves";
import { catalogSeoPagePath, catalogSeoPages } from "@/lib/catalogSeoPages";

export const dynamic = "force-dynamic";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dimohod-trade.pro";
const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function absoluteUrl(path: string) {
  return new URL(`${appBasePath}${path}`, appUrl).toString();
}

function flattenCategories(categories: CategoryNode[]): CategoryNode[] {
  return categories.flatMap((category) => [category, ...flattenCategories(category.children)]);
}

function sitemapEntry(path: string, updatedAt?: string | Date | null): MetadataRoute.Sitemap[number] {
  const date = updatedAt ? new Date(updatedAt) : null;
  return {
    url: absoluteUrl(path),
    ...(date && !Number.isNaN(date.getTime()) ? { lastModified: date } : {}),
  };
}

const lastModified = {
  home: new Date("2026-08-31T03:26:04Z"),
  catalog: new Date("2026-08-13T18:10:07Z"),
  solutions: new Date("2026-08-31T03:26:04Z"),
  guides: new Date("2026-08-31T03:11:04Z"),
  delivery: new Date("2026-08-30T22:58:53Z"),
  configurator: new Date("2026-08-24T01:08:57Z"),
  stoves: new Date("2026-08-24T04:25:07Z"),
} as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: lastModified.home },
    { url: absoluteUrl("/catalog"), lastModified: lastModified.catalog },
    ...Array.from({ length: stovePageCount }, (_, index) => ({
      url: absoluteUrl(stovePagePath(index + 1)),
      lastModified: lastModified.stoves,
    })),
    { url: absoluteUrl("/solutions"), lastModified: lastModified.solutions },
    { url: absoluteUrl("/guides"), lastModified: lastModified.guides },
    { url: absoluteUrl("/delivery"), lastModified: lastModified.delivery },
    { url: absoluteUrl("/configurator"), lastModified: lastModified.configurator },
    ...Object.keys(scenarioPages).map((slug) => ({
      url: absoluteUrl(`/solutions/${slug}`),
      lastModified: lastModified.solutions,
    })),
    ...guideArticles.map(({ slug, modifiedAt }) => ({
      url: absoluteUrl(`/guides/${slug}`),
      lastModified: new Date(modifiedAt),
    })),
    ...catalogSeoPages.filter((page) => page.indexable).map((page) => ({
      url: absoluteUrl(catalogSeoPagePath(page)),
      lastModified: lastModified.catalog,
    })),
  ];

  try {
    const [categories, productPages] = await Promise.all([
      getCatalogTree(),
      getProductSeoPages(),
    ]);
    return [
      ...staticPages,
      ...flattenCategories(categories).map((category) =>
        sitemapEntry(`/catalog/${category.slug}`, category.updated_at)),
      ...productPages.map((page) =>
        sitemapEntry(productPublicPath(page.product_slug, page), page.updated_at)),
    ];
  } catch {
    return staticPages;
  }
}
