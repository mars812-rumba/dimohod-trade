import {
  catalogCategoryPath,
  normalizeCatalogFilters,
  type CatalogFilters,
} from "./catalogFilters";

export type CatalogSeoPage = {
  slug: string;
  category: string;
  filters: CatalogFilters;
  h1: string;
  title: string;
  description: string;
  intro: string;
  indexable: true;
};

// SEO-посадочные добавляются только после ручного подтверждения комбинации,
// коммерческого спроса и текстов владельцем. Не генерировать список из SKU.
export const catalogSeoPages: readonly CatalogSeoPage[] = [];

function pageKey(category: string, slug: string) {
  return `${category}/${slug}`;
}

export function validateCatalogSeoPages(pages: readonly CatalogSeoPage[]) {
  const keys = new Set<string>();
  pages.forEach((page) => {
    const key = pageKey(page.category, page.slug);
    if (keys.has(key)) throw new Error(`Duplicate catalog SEO page: ${key}`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(page.category)) {
      throw new Error(`Invalid catalog SEO category: ${page.category}`);
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(page.slug)) {
      throw new Error(`Invalid catalog SEO slug: ${page.slug}`);
    }
    const normalizedFilters = normalizeCatalogFilters(page.filters);
    if (
      !Object.keys(normalizedFilters).length
      || Object.keys(normalizedFilters).length !== Object.keys(page.filters).length
      || normalizedFilters.page
      || normalizedFilters.length === "all"
    ) {
      throw new Error(`Invalid filters for catalog SEO page: ${key}`);
    }
    if (![page.h1, page.title, page.description, page.intro].every((value) => value.trim())) {
      throw new Error(`Missing metadata for catalog SEO page: ${key}`);
    }
    keys.add(key);
  });
}

validateCatalogSeoPages(catalogSeoPages);

export function catalogSeoPagePath(page: Pick<CatalogSeoPage, "category" | "slug">): string {
  return `${catalogCategoryPath(page.category)}/${encodeURIComponent(page.slug)}`;
}

export function getCatalogSeoPage(category: string, slug: string): CatalogSeoPage | null {
  return catalogSeoPages.find((page) => page.category === category && page.slug === slug) ?? null;
}

export function catalogSeoPagesForCategory(category: string): readonly CatalogSeoPage[] {
  return catalogSeoPages.filter((page) => page.category === category && page.indexable);
}
