import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ProductListItem } from "@/lib/api";

const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function publicMediaUrl(url: string) {
  return url.startsWith("/media/") ? `${appBasePath}${url}` : url;
}

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

export function CatalogProductCard({ product }: { product: ProductListItem }) {
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
  ].filter((value): value is string => Boolean(value));
  const href = product.selected_sku
    ? `/product/${product.slug}?sku=${encodeURIComponent(product.selected_sku)}`
    : `/product/${product.slug}`;

  return (
    <Link className="catalog-product-card" href={href}>
      <div className="catalog-product-media">
        {product.primary_image ? (
          <img
            src={publicMediaUrl(product.primary_image.url)}
            alt={product.primary_image.alt ?? `${product.name} — общий вид`}
          />
        ) : (
          <span>{product.product_kind ?? "товар"}</span>
        )}
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
