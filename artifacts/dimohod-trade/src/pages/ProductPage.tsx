import { Link, useParams } from "wouter";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useProduct } from "@/lib/api";

function formatPrice(value: string | null) {
  if (value === null) {
    return "Цена по запросу";
  }
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";

  const { data: product, isLoading, error } = useProduct(slug);

  if (isLoading) {
    return (
      <main className="page">
        <div className="empty">Загружаем товар…</div>
      </main>
    );
  }

  if (error?.message === "not_found") {
    return (
      <main className="page">
        <div className="empty">Товар не найден.</div>
        <Link className="button secondary" href="/catalog">
          <ArrowLeft size={18} /> В каталог
        </Link>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="page">
        <div className="empty">Не удалось загрузить товар.</div>
      </main>
    );
  }

  return (
    <main className="page">
      <Link className="button secondary" href="/catalog">
        <ArrowLeft size={18} /> Назад в каталог
      </Link>

      <section className="product-layout section">
        <article className="product-panel">
          <p className="eyebrow">{product.category.name}</p>
          <h1 className="product-title">{product.name}</h1>
          {product.short_description ? <p className="lead">{product.short_description}</p> : null}

          {product.application_tags.length > 0 ? (
            <div className="tag-row">
              {product.application_tags.map((tag) => (
                <span className="chip" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <div className="grid">
            <div className="spec">
              <span>Материал</span>
              <strong>{product.material ?? "TBD"}</strong>
            </div>
            <div className="spec">
              <span>Диаметр</span>
              <strong>{product.diameter_mm ? `${product.diameter_mm} мм` : "TBD"}</strong>
            </div>
            <div className="spec">
              <span>Стенка</span>
              <strong>
                {product.wall_thickness_mm ? `${product.wall_thickness_mm} мм` : "TBD"}
              </strong>
            </div>
          </div>

          {product.description ? <p className="lead">{product.description}</p> : null}

          {product.compatibility_notes ? (
            <div className="empty">
              <CheckCircle2 size={18} /> {product.compatibility_notes}
            </div>
          ) : null}
        </article>

        <aside className="sku-panel">
          <p className="eyebrow">SKU</p>
          <h2>Варианты и цены</h2>
          <div className="sku-list">
            {product.skus.map((sku) => (
              <article className="sku" key={sku.id}>
                <strong>{sku.name}</strong>
                <div className="sku">
                  <span>{sku.article}</span>
                </div>
                <div className="price">{formatPrice(sku.price_rub)}</div>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
