import type { MetadataRoute } from "next";
import { getCatalogTree, getProductSeoPages, type CategoryNode } from "@/lib/api";
import { productPublicPath } from "@/lib/productUrls";
import { scenarioPages } from "@/lib/scenarioPages";
import { guideArticles } from "@/lib/guideArticles";
import { stovePageCount, stovePagePath } from "@/lib/stoves";

export const dynamic = "force-dynamic";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dimohod-trade.pro";
const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function absoluteUrl(path: string) {
  return new URL(`${appBasePath}${path}`, appUrl).toString();
}

function flattenCategories(categories: CategoryNode[]): CategoryNode[] {
  return categories.flatMap((category) => [category, ...flattenCategories(category.children)]);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/") },
    { url: absoluteUrl("/catalog") },
    ...Array.from({ length: stovePageCount }, (_, index) => ({
      url: absoluteUrl(stovePagePath(index + 1)),
    })),
    { url: absoluteUrl("/solutions") },
    { url: absoluteUrl("/guides") },
    { url: absoluteUrl("/delivery") },
    { url: absoluteUrl("/configurator") },
    { url: absoluteUrl("/solutions/banya/zamery") },
    { url: absoluteUrl("/zamery") },
    { url: absoluteUrl("/privacy") },
    { url: absoluteUrl("/consent-personal-data") },
    { url: absoluteUrl("/cookie-policy") },
    { url: absoluteUrl("/user-agreement") },
    ...Object.keys(scenarioPages).map((slug) => ({
      url: absoluteUrl(`/solutions/${slug}`),
    })),
    ...guideArticles.map(({ slug }) => ({
      url: absoluteUrl(`/guides/${slug}`),
    })),
  ];

  try {
    const [categories, productPages] = await Promise.all([
      getCatalogTree(),
      getProductSeoPages(),
    ]);
    const paths = new Set<string>();
    flattenCategories(categories).forEach((category) => {
      paths.add(`/catalog/${category.slug}`);
    });
    productPages.forEach((page) => {
      paths.add(productPublicPath(page.product_slug, page));
    });
    return [
      ...staticPages,
      ...Array.from(paths, (path) => ({ url: absoluteUrl(path) })),
    ];
  } catch {
    return staticPages;
  }
}
