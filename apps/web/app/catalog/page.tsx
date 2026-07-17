import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getCatalogTree, getProducts, type CategoryNode, type ProductListItem } from "@/lib/api";

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
  const specs = [
    product.product_kind,
    product.diameter_mm ? `Ø ${product.diameter_mm} мм` : null,
    product.steel_grade ?? product.material,
    product.wall_thickness_mm ? `${product.wall_thickness_mm} мм` : null,
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
  }>;
};

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params?.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;
  let categories: CategoryNode[] = [];
  let products: ProductListItem[] = [];
  let total = 0;
  let loadError = false;

  try {
    const [categoryItems, productResponse] = await Promise.all([
      getCatalogTree(),
      getProducts({ limit: PAGE_SIZE, offset }),
    ]);
    categories = categoryItems;
    products = productResponse.items;
    total = productResponse.total;
  } catch {
    loadError = true;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;

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
                <span>товаров в базе</span>
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
                <Link className="button secondary" href={`/catalog?page=${prevPage}`}>
                  <ArrowLeft size={16} /> Назад
                </Link>
              ) : (
                <span />
              )}
              <span>
                Страница {page} из {totalPages}
              </span>
              {nextPage ? (
                <Link className="button" href={`/catalog?page=${nextPage}`}>
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
