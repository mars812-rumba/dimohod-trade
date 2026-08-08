import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { notFound } from "next/navigation";
import { CatalogProductCard } from "@/components/CatalogProductCard";
import { CatalogVariantFilters } from "@/components/CatalogVariantFilters";
import {
  getCatalogTree,
  getProductFilters,
  getProducts,
  type CategoryNode,
} from "@/lib/api";
import { filterVariantItems } from "@/lib/variantSelection";

const PAGE_SIZE = 48;
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type CategoryPageProps = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{
    diameter?: string;
    inner_pipe?: string;
    inner_thickness?: string;
    outer_pipe?: string;
    execution?: string;
    length?: string;
    page?: string;
  }>;
};

function allCategories(categories: CategoryNode[]): CategoryNode[] {
  return categories.flatMap((category) => [category, ...allCategories(category.children)]);
}

async function categoryBySlug(slug: string) {
  const categories = await getCatalogTree();
  return allCategories(categories).find((category) => category.slug === slug) ?? null;
}

function absoluteUrl(path: string) {
  return new URL(`${appBasePath}${path}`, appUrl).toString();
}

function categoryHref(
  slug: string,
  current: Record<string, string | undefined>,
  changes: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();
  Object.entries({ ...current, ...changes }).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });
  const query = params.toString();
  return `/catalog/${slug}${query ? `?${query}` : ""}`;
}

function selectedFilter(value: string | undefined, options: Array<{ value: string }>) {
  const requested = value?.trim();
  return requested && options.some((option) => option.value === requested) ? requested : undefined;
}

function selectedOrFirst(value: string | undefined, options: Array<{ value: string }>) {
  return selectedFilter(value, options) ?? options[0]?.value;
}

function compoundParts(value: string | undefined, size: number) {
  const parts = value?.split("|") ?? [];
  return Array.from({ length: size }, (_, index) => parts[index] || undefined);
}

function combinationValue(
  combination: Awaited<ReturnType<typeof getProductFilters>>["variant_combinations"][number],
  key: string,
) {
  const value = combination[key as keyof typeof combination];
  return typeof value === "string" ? value : null;
}

function isPipeCategory(category: CategoryNode) {
  return /(?:труб|trub)/iu.test(`${category.name} ${category.slug}`);
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category: slug } = await params;
  const category = await categoryBySlug(slug);
  if (!category) {
    return { title: "Категория не найдена | Дымоход Трейд" };
  }
  const title = `${category.name} — купить | Дымоход Трейд`;
  const description =
    category.description ??
    `${category.name}: выбор изделий по диаметру, материалу и марке стали в каталоге Дымоход Трейд.`;
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/catalog/${category.slug}`) },
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const [{ category: slug }, query] = await Promise.all([params, searchParams]);
  const category = await categoryBySlug(slug);
  if (!category) {
    notFound();
  }

  const filters = await getProductFilters(category.slug);
  const requestedDiameter = query.diameter?.trim();
  const appliedDiameter = filters.diameters.some((option) => option.value === requestedDiameter)
    ? requestedDiameter
    : undefined;
  const appliedInnerPipe = selectedFilter(query.inner_pipe, filters.inner_pipes);
  const appliedOuterPipe = selectedFilter(query.outer_pipe, filters.outer_pipes);
  const diameter = appliedDiameter ?? filters.diameters[0]?.value;
  let innerPipe = selectedOrFirst(appliedInnerPipe, filters.inner_pipes);
  let outerPipe = filters.outer_pipes.length
    ? selectedOrFirst(appliedOuterPipe, filters.outer_pipes)
    : undefined;
  const execution = selectedFilter(query.execution, filters.executions);
  const defaultLength = isPipeCategory(category) && filters.lengths.some((option) => option.value === "1000")
    ? "1000"
    : undefined;
  const allLengthsRequested = query.length === "all";
  const length = allLengthsRequested
    ? undefined
    : selectedFilter(query.length, filters.lengths) ?? (query.length ? undefined : defaultLength);
  let innerThickness = selectedFilter(query.inner_thickness, filters.wall_thicknesses);
  const diameterCombinations = filterVariantItems(
    filters.variant_combinations,
    { diameter },
    combinationValue,
  );
  if (
    diameterCombinations.length &&
    !diameterCombinations.some((combination) => combination.inner_pipe === innerPipe)
  ) {
    innerPipe = diameterCombinations[0].inner_pipe;
  }
  const innerCombinations = filterVariantItems(
    diameterCombinations,
    { inner_pipe: innerPipe },
    combinationValue,
  );
  if (
    innerThickness &&
    !innerCombinations.some((combination) => combination.inner_thickness === innerThickness)
  ) {
    innerThickness = undefined;
  }
  const matchingPipeCombinations = filterVariantItems(
    innerCombinations,
    { inner_thickness: innerThickness },
    combinationValue,
  );
  if (
    matchingPipeCombinations.length &&
    !matchingPipeCombinations.some((combination) => combination.outer_pipe === outerPipe)
  ) {
    outerPipe = matchingPipeCombinations[0].outer_pipe;
  }
  const [material, steel] = compoundParts(appliedInnerPipe, 2);
  const [outerMaterial, outerSteel, outerThickness] = compoundParts(appliedOuterPipe, 3);
  const [preferredMaterial, preferredSteel] = compoundParts(innerPipe, 2);
  const [preferredOuterMaterial, preferredOuterSteel] = compoundParts(outerPipe, 3);
  const [angle, insulation] = compoundParts(execution, 2);
  const page = Math.max(1, Number(query.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const currentFilters = {
    diameter: appliedDiameter,
    inner_pipe: appliedInnerPipe,
    inner_thickness: innerThickness,
    outer_pipe: appliedOuterPipe,
    execution,
    length: allLengthsRequested ? "all" : length,
  };
  const extraFacets = [
    {
      name: "length",
      label: "Длина L",
      value: allLengthsRequested ? "all" : length,
      options: filters.lengths,
      allValue: defaultLength ? "all" : "",
    },
  ];

  const productResponse = await getProducts({
    limit: PAGE_SIZE,
    offset,
    category: category.slug,
    diameter: appliedDiameter,
    steelGrade: steel,
    material,
    outerSteelGrade: outerSteel,
    outerMaterial,
    length,
    wallThickness: innerThickness,
    outerWallThickness: outerThickness,
    angle,
    insulation,
    preferredDiameter: diameter,
    preferredSteelGrade: preferredSteel,
    preferredMaterial,
    preferredOuterSteelGrade: preferredOuterSteel,
    preferredOuterMaterial,
  });
  const totalPages = Math.max(1, Math.ceil(productResponse.total / PAGE_SIZE));

  return (
    <main className="page catalog-page">
      <section className="section catalog-category-page">
        <nav className="breadcrumb" aria-label="Навигация">
          <Link href="/">Главная</Link>
          <span aria-hidden>/</span>
          <Link href="/catalog">Каталог</Link>
          <span aria-hidden>/</span>
          <span>{category.name}</span>
        </nav>

        <div className="catalog-category-heading">
          <div>
            <p className="eyebrow">Категория</p>
            <h1 className="product-title">{category.name}</h1>
          </div>
          <div className="catalog-result-count">
            <strong>{productResponse.total}</strong>
            <span>семейств найдено</span>
          </div>
        </div>
        {category.description ? <p className="lead catalog-category-description">{category.description}</p> : null}

        <details className="catalog-mobile-filter" open>
          <summary>
            <span>
              <SlidersHorizontal size={17} /> Фильтры
            </span>
            <ChevronDown aria-hidden="true" className="catalog-filter-chevron" size={17} />
          </summary>
          <form
            className="catalog-variant-filters"
            key={Object.values(currentFilters).map((value) => value ?? "").join("|")}
            method="get"
          >
            <CatalogVariantFilters
              diameter={diameter}
              diameters={filters.diameters}
              execution={execution}
              executions={filters.executions}
              facets={extraFacets}
              innerPipe={innerPipe}
              innerPipes={filters.inner_pipes}
              innerThickness={innerThickness}
              innerThicknesses={filters.wall_thicknesses}
              outerPipe={outerPipe}
              outerPipes={filters.outer_pipes}
              variantCombinations={filters.variant_combinations}
            />
            {Object.values(query).some(Boolean) ? (
              <Link className="catalog-filter-reset" href={`/catalog/${category.slug}`}>
                <X size={14} /> Сбросить
              </Link>
            ) : null}
          </form>
        </details>

        {productResponse.items.length ? (
          <div className="catalog-products-grid">
            {productResponse.items.map((product) => (
              <CatalogProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="state-empty">По выбранным параметрам ничего не найдено.</div>
        )}

        <nav className="catalog-pagination" aria-label="Пагинация категории">
          {page > 1 ? (
            <Link
              className="button secondary"
              href={categoryHref(category.slug, currentFilters, { page: page > 2 ? String(page - 1) : undefined })}
            >
              <ArrowLeft size={16} /> Назад
            </Link>
          ) : (
            <span />
          )}
          <span>Страница {page} из {totalPages}</span>
          {page < totalPages ? (
            <Link
              className="button"
              href={categoryHref(category.slug, currentFilters, { page: String(page + 1) })}
            >
              Дальше <ArrowRight size={16} />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </section>
    </main>
  );
}
