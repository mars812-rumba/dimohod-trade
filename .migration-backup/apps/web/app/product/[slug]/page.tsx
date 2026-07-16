import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { getProduct } from "@/lib/api";

type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function formatPrice(value: string | null) {
  if (value === null) {
    return "Cena po zaprosu";
  }

  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
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

          <div className="tag-row">
            {product.application_tags.map((tag) => (
              <span className="chip" key={tag}>
                {tag}
              </span>
            ))}
          </div>

          <div className="grid">
            <div className="spec">
              <span>Material</span>
              <strong>{product.material ?? "TBD"}</strong>
            </div>
            <div className="spec">
              <span>Diameter</span>
              <strong>{product.diameter_mm ? `${product.diameter_mm} mm` : "TBD"}</strong>
            </div>
            <div className="spec">
              <span>Wall</span>
              <strong>
                {product.wall_thickness_mm ? `${product.wall_thickness_mm} mm` : "TBD"}
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
                <span>{sku.article}</span>
                <div className="price">{formatPrice(sku.price_rub)}</div>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
