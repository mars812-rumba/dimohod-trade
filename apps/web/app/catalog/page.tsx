import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  getCatalogTree,
  getProductFilters,
  getProducts,
  type CategoryNode,
  type ProductKindFilter,
  type ProductListItem,
} from "@/lib/api";

const PAGE_SIZE = 48;

function formatPrice(value: string | null) {
  if (value === null || Number(value) <= 0) {
    return "Цена по запросу";
  }

  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function CategoryRow({ category }: { category: CategoryNode }) {
  return (
    <article className="category-row">
      <div>
        <p className="meta">/{category.slug}</p>
        <h3>{category.name}</h3>
        {category.description ? <p>{category.description}</p> : null}
        {category.children.length > 0 ? (
          <div className="children">
            {category.children.map((child) => (
              <span className="chip" key={child.id}>
                {child.name}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <Link className="icon-button" href={`/catalog#${category.slug}`} aria-label={category.name}>
        <ArrowRight size={18} />
      </Link>
    </article>
  );
}

function ProductCard({ product }: { product: ProductListItem }) {
  const diameterLabel = product.diameter_mm
    ? product.outer_diameter_mm
      ? `Ø ${product.diameter_mm}/${product.outer_diameter_mm} мм`
      : `Ø ${product.diameter_mm} мм`
    : null;
  const specs = [
    product.product_kind,
    diameterLabel,
    product.steel_grade ?? product.material,
    product.wall_thickness_mm ? `${product.wall_thickness_mm} мм` : null,
    product.insulation_mm ? `изоляция ${product.insulation_mm} мм` : null,
  ].filter(Boolean);

  return (
    <Link className="catalog-product-card" href={`/product/${product.slug}`}>
      <div className="catalog-product-media">
        <span>{product.product_kind ?? "товар"}</span>
      </div>
      <div className="catalog-product-body">
        <p className="meta">{product.category.name}</p>
        <h3>{product.name}</h3>
        <div className="catalog-product-specs">
          {specs.map((spec) => (
            <span className="chip" key={spec}>
              {spec}
            </span>
          ))}
        </div>
        <div className="catalog-product-footer">
          <strong>{formatPrice(product.price_rub)}</strong>
          <span>
            {product.sku_count} SKU <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
}

type CatalogPageProps = {
  searchParams?: Promise<{
    page?: string;
    product_kind?: string;
  }>;
};

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const productKind = params?.product_kind?.trim() || undefined;
  const page = Math.max(1, Number(params?.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;
  let categories: CategoryNode[] = [];
  let productKindFilters: ProductKindFilter[] = [];
  let products: ProductListItem[] = [];
  let total = 0;
  let loadError = false;

  try {
    const [categoryItems, filterResponse, productResponse] = await Promise.all([
      getCatalogTree(),
      getProductFilters(),
      getProducts({ limit: PAGE_SIZE, offset, productKind }),
    ]);
    categories = categoryItems;
    productKindFilters = filterResponse.product_kinds;
    products = productResponse.items;
    total = productResponse.total;
  } catch {
    loadError = true;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;
  const pageHref = (targetPage: number) => {
    const nextParams = new URLSearchParams();
    if (targetPage > 1) {
      nextParams.set("page", String(targetPage));
    }
    if (productKind) {
      nextParams.set("product_kind", productKind);
    }
    const query = nextParams.toString();
    return query ? `/catalog?${query}` : "/catalog";
  };

  return (
    <main className="page">
      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Каталог из базы данных</p>
            <h1 className="product-title">Каталог дымоходов</h1>
          </div>
          <p>
            Товарная выдача уже читает PostgreSQL: категории, позиции, SKU, цены, диаметры,
            материалы и структурированные поля после импорта прайса.
          </p>
        </div>

        {loadError ? (
          <div className="state-empty">Backend пока не ответил. Запусти API или docker compose.</div>
        ) : null}

        {!loadError && categories.length === 0 ? (
          <div className="state-empty">Категории пока пустые. Запусти seed для demo-данных.</div>
        ) : null}

        {!loadError ? (
          <>
            <div className="catalog-summary">
              <div>
                <strong>{total}</strong>
                <span>{productKind ? "товаров по фильтру" : "товаров в базе"}</span>
              </div>
              <div>
                <strong>{products.length}</strong>
                <span>на этой странице</span>
              </div>
              <div>
                <strong>{page} / {totalPages}</strong>
                <span>страница</span>
              </div>
            </div>

            {productKindFilters.length > 0 ? (
              <section className="catalog-filter-panel" aria-labelledby="catalog-product-kind-title">
                <div>
                  <p className="eyebrow">Фильтр по изделиям</p>
                  <h2 id="catalog-product-kind-title">Что ищем?</h2>
                </div>
                <div className="catalog-filter-chips">
                  <Link className={`filter-chip ${!productKind ? "active" : ""}`} href="/catalog">
                    Все изделия
                  </Link>
                  {productKindFilters.map((filter) => (
                    <Link
                      className={`filter-chip ${productKind === filter.value ? "active" : ""}`}
                      href={`/catalog?product_kind=${encodeURIComponent(filter.value)}`}
                      key={filter.value}
                    >
                      {filter.label}
                      <span>{filter.count}</span>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <h2 className="catalog-subtitle">Категории</h2>
            <div className="category-list catalog-category-list">
              {categories.map((category) => (
                <CategoryRow key={category.id} category={category} />
              ))}
            </div>

            <h2 className="catalog-subtitle">Товары</h2>
            {products.length === 0 ? (
              <div className="state-empty">Товаров пока нет.</div>
            ) : (
              <div className="catalog-products-grid">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            <nav className="catalog-pagination" aria-label="Пагинация каталога">
              {prevPage ? (
                <Link className="button secondary" href={pageHref(prevPage)}>
                  <ArrowLeft size={16} /> Назад
                </Link>
              ) : (
                <span />
              )}
              <span>
                Страница {page} из {totalPages}
              </span>
              {nextPage ? (
                <Link className="button" href={pageHref(nextPage)}>
                  Дальше <ArrowRight size={16} />
                </Link>
              ) : (
                <span />
              )}
            </nav>
          </>
        ) : null}
      </section>
    </main>
  );
}
