import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Search, SlidersHorizontal, X } from "lucide-react";
import { notFound } from "next/navigation";
import { CatalogProductCard } from "@/components/CatalogProductCard";
import {
  getCatalogTree,
  getProductFilters,
  getProducts,
  type CategoryNode,
  type ProductFilterOption,
} from "@/lib/api";

const PAGE_SIZE = 48;
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type CategoryPageProps = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{
    q?: string;
    diameter?: string;
    steel?: string;
    material?: string;
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

function FilterSelect({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value?: string;
  options: ProductFilterOption[];
}) {
  return (
    <label className="catalog-filter-field">
      <span>{label}</span>
      <select defaultValue={value ?? ""} name={name}>
        <option value="">Все</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label} · {option.count}
          </option>
        ))}
      </select>
    </label>
  );
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

  const search = query.q?.trim() || undefined;
  const diameter = query.diameter?.trim() || undefined;
  const steel = query.steel?.trim() || undefined;
  const material = query.material === "stainless" || query.material === "galvanized" ? query.material : undefined;
  const page = Math.max(1, Number(query.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const currentFilters = { q: search, diameter, steel, material };

  const [filters, productResponse] = await Promise.all([
    getProductFilters(category.slug),
    getProducts({
      limit: PAGE_SIZE,
      offset,
      category: category.slug,
      search,
      diameter,
      steelGrade: steel,
      material,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(productResponse.total / PAGE_SIZE));

  return (
    <main className="page">
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
          <form className="catalog-variant-filters" method="get">
            <label className="catalog-search-field">
              <span>Поиск по названию</span>
              <div>
                <Search aria-hidden="true" size={17} />
                <input defaultValue={search ?? ""} name="q" placeholder="Например, дефлектор" type="search" />
              </div>
            </label>
            <FilterSelect label="Диаметр d/D" name="diameter" options={filters.diameters} value={diameter} />
            <FilterSelect label="Марка стали" name="steel" options={filters.steel_grades} value={steel} />
            {material ? <input name="material" type="hidden" value={material} /> : null}
            <button className="button catalog-filter-submit" type="submit">
              Показать
            </button>
            <div className="catalog-material-filter" aria-label="Материал">
              <span>Материал</span>
              <div>
                <Link
                  aria-pressed={!material}
                  className={`filter-chip ${!material ? "active" : ""}`}
                  href={categoryHref(category.slug, currentFilters, {
                    material: undefined,
                    steel: undefined,
                    page: undefined,
                  })}
                >
                  Любой
                </Link>
                {filters.materials
                  .filter((option) => option.value === "stainless" || option.value === "galvanized")
                  .map((option) => (
                    <Link
                      aria-pressed={material === option.value}
                      className={`filter-chip ${material === option.value ? "active" : ""}`}
                      href={categoryHref(category.slug, currentFilters, {
                        material: option.value,
                        steel: undefined,
                        page: undefined,
                      })}
                      key={option.value}
                    >
                      {option.label} <span>{option.count}</span>
                    </Link>
                  ))}
              </div>
            </div>
            {search || diameter || steel || material ? (
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
