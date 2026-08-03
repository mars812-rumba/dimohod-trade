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

function stockLabel(value: string | null) {
  if (!value || value === "unknown") {
    return null;
  }
  return {
    in_stock: "В наличии",
    out_of_stock: "Нет в наличии",
    on_order: "Под заказ",
  }[value] ?? value;
}

const attributeLabels: Record<string, string> = {
  outer_material: "Наружный материал",
  outer_steel_grade: "Наружная сталь",
  outer_wall_thickness_mm: "Наружная стенка",
  insulation_material: "Материал утепления",
  connection_type: "Соединение",
};

function attributeLabel(key: string) {
  return attributeLabels[key] ?? key.replaceAll("_", " ");
}

function attributeValue(key: string, value: unknown) {
  if (typeof value === "boolean") {
    return value ? "Да" : "Нет";
  }
  const suffix = key.endsWith("_mm") ? " мм" : "";
  return `${String(value)}${suffix}`;
}

export function CatalogProductCard({ product }: { product: ProductListItem }) {
  const diameterLabel = product.diameter_mm
    ? product.outer_diameter_mm
      ? `Ø ${product.diameter_mm}/${product.outer_diameter_mm} мм`
      : `Ø ${product.diameter_mm} мм`
    : null;
  const specs = [
    product.product_kind,
    product.article ? `Арт. ${product.article}` : null,
    diameterLabel,
    product.length_mm !== null ? `L ${product.length_mm} мм` : null,
    product.angle_deg !== null ? `Угол ${product.angle_deg}°` : null,
    product.wall_thickness_mm ? `S ${product.wall_thickness_mm} мм` : null,
    product.insulation_mm !== null ? `Утепление ${product.insulation_mm} мм` : null,
    product.contour ? `Контур ${product.contour}` : null,
    product.material ? `Материал ${product.material}` : null,
    product.steel_grade ? `Сталь ${product.steel_grade}` : null,
    stockLabel(product.stock_status),
    ...Object.entries(product.attributes).map(
      ([key, value]) => `${attributeLabel(key)}: ${attributeValue(key, value)}`,
    ),
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
