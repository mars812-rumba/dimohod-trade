import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ProductListItem } from "@/lib/api";
import { steelSelectionBadges } from "@/lib/steelSelection";

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

function textAttribute(attributes: Record<string, unknown>, key: string) {
  const value = attributes[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

function decimalLabel(value: string | number) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(parsed)
    : String(value).replace(".", ",");
}

function catalogSpecs(product: ProductListItem) {
  const attributes = product.attributes;
  const diameter = product.diameter_mm
    ? product.outer_diameter_mm
      ? `Ø ${product.diameter_mm}/${product.outer_diameter_mm} мм`
      : `Ø ${product.diameter_mm} мм`
    : null;
  const diameterRange = diameter ? null : textAttribute(attributes, "diameter_range");
  const baseSize = textAttribute(attributes, "base_size");
  const sizeRange = baseSize ? null : textAttribute(attributes, "size_range");
  const execution = textAttribute(attributes, "execution");
  const maxRoofAngle = textAttribute(attributes, "max_roof_angle_deg");
  const outerSteelGrade = textAttribute(attributes, "outer_steel_grade");
  const outerMaterial = textAttribute(attributes, "outer_material");
  const outerWallThickness = textAttribute(attributes, "outer_wall_thickness_mm");

  return [
    diameter,
    diameterRange ? `Ø ${diameterRange}` : null,
    product.length_mm !== null ? `Длина ${product.length_mm} мм` : null,
    product.angle_deg !== null ? `Угол ${product.angle_deg}°` : null,
    baseSize ? `Основание ${baseSize}` : null,
    sizeRange ? `Размер ${sizeRange}` : null,
    execution ? `Исполнение ${execution}` : null,
    maxRoofAngle ? `Угол кровли до ${maxRoofAngle}°` : null,
    product.insulation_mm !== null ? `Утепление ${product.insulation_mm} мм` : null,
    product.steel_grade ? `Внутренняя сталь ${product.steel_grade}` : null,
    outerSteelGrade ? `Наружная сталь ${outerSteelGrade}` : null,
    !product.steel_grade && product.material ? `Материал внутренней трубы ${product.material}` : null,
    !outerSteelGrade && outerMaterial ? `Материал наружной трубы ${outerMaterial}` : null,
    product.wall_thickness_mm
      ? `Внутренняя труба ${decimalLabel(product.wall_thickness_mm)} мм`
      : null,
    outerWallThickness ? `Наружная труба ${decimalLabel(outerWallThickness)} мм` : null,
    stockLabel(product.stock_status),
  ]
    .filter((value): value is string => Boolean(value))
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, 5);
}

export function CatalogProductCard({ product }: { product: ProductListItem }) {
  const specs = catalogSpecs(product);
  const steelBadges = steelSelectionBadges(product);
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
        {steelBadges.length > 0 ? (
          <div
            className="product-image-badges catalog-product-image-badges"
            aria-label="Назначение варианта"
          >
            {steelBadges.map((badge) => (
              <span
                className={`product-image-badge product-image-badge-${badge.tone}`}
                key={`${badge.tone}-${badge.label}`}
              >
                {badge.label}
              </span>
            ))}
          </div>
        ) : null}
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
