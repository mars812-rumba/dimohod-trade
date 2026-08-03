import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, SlidersHorizontal, X } from "lucide-react";
import { notFound } from "next/navigation";
import { CatalogProductCard } from "@/components/CatalogProductCard";
import { CatalogVariantFilters } from "@/components/CatalogVariantFilters";
import {
  getCatalogTree,
  getProductFilters,
  getProducts,
  type CategoryNode,
} from "@/lib/api";
import {
  type CatalogMaterial,
  defaultCatalogMaterial,
  steelGradesForMaterial,
} from "@/lib/catalogFilters";

const PAGE_SIZE = 48;
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type CategoryPageProps = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{
    diameter?: string;
    steel?: string;
    material?: string;
    length?: string;
    thickness?: string;
    angle?: string;
    insulation?: string;
    contour?: string;
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
  const diameter = filters.diameters.some((option) => option.value === requestedDiameter)
    ? requestedDiameter
    : filters.diameters[0]?.value;
  const requestedMaterial =
    query.material === "stainless" || query.material === "galvanized"
      ? query.material
      : undefined;
  const material = (requestedMaterial && filters.materials.some((option) => option.value === requestedMaterial)
    ? requestedMaterial
    : defaultCatalogMaterial(filters.materials)) as CatalogMaterial;
  const materialSteels = steelGradesForMaterial(filters.steel_grades, material);
  const requestedSteel = query.steel?.trim();
  const steel = materialSteels.some((option) => option.value === requestedSteel)
    ? requestedSteel
    : materialSteels[0]?.value;
  const length = selectedFilter(query.length, filters.lengths);
  const thickness = selectedFilter(query.thickness, filters.wall_thicknesses);
  const angle = selectedFilter(query.angle, filters.angles);
  const insulation = selectedFilter(query.insulation, filters.insulations);
  const contour = selectedFilter(query.contour, filters.contours);
  const page = Math.max(1, Number(query.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const currentFilters = { diameter, steel, material, length, thickness, angle, insulation, contour };
  const extraFacets = [
    { name: "length", label: "Длина L", value: length, options: filters.lengths },
    { name: "thickness", label: "Толщина стали S", value: thickness, options: filters.wall_thicknesses },
    { name: "angle", label: "Угол поворота", value: angle, options: filters.angles },
    { name: "insulation", label: "Утепление", value: insulation, options: filters.insulations },
    { name: "contour", label: "Контур", value: contour, options: filters.contours },
  ];

  const productResponse = await getProducts({
    limit: PAGE_SIZE,
    offset,
    category: category.slug,
    diameter,
    steelGrade: steel,
    material,
    length,
    wallThickness: thickness,
    angle,
    insulation,
    contour,
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
            <SlidersHorizontal size={17} /> Фильтры
          </summary>
          <form
            className="catalog-variant-filters"
            key={Object.values(currentFilters).map((value) => value ?? "").join("|")}
            method="get"
          >
            <CatalogVariantFilters
              diameter={diameter}
              diameters={filters.diameters}
              material={material}
              materials={filters.materials}
              steel={steel}
              steelGrades={filters.steel_grades}
              facets={extraFacets}
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
