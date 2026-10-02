import { getCatalogTree, type CategoryNode } from "@/lib/api";

export function flattenCatalogCategories(categories: CategoryNode[]): CategoryNode[] {
  return categories.flatMap((category) => [category, ...flattenCatalogCategories(category.children)]);
}

export async function getCatalogCategoryBySlug(slug: string): Promise<CategoryNode | null> {
  const categories = await getCatalogTree();
  return flattenCatalogCategories(categories).find((category) => category.slug === slug) ?? null;
}
