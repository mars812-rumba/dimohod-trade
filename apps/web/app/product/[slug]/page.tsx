import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getProduct, type Product, type SKU } from "@/lib/api";
import { ProductExperience } from "@/components/ProductExperience";
import {
  isUuidReference,
  parseProductRoute,
  productDiameterValue,
  productPublicPath,
  productSelectionPath,
} from "@/lib/productUrls";
import { ensureDiameterInTitle } from "@/lib/productMetadata";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    length?: string | string[];
    sku?: string | string[];
  }>;
};

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function absoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return new URL(`${appBasePath}${path}`, appUrl).toString();
}

function textAttribute(product: Product, key: string): string | null {
  const value = product.extra_attributes[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function skuSeoAttribute(sku: SKU | null, key: string): string | null {
  const rawSeo = sku?.attributes.sku_seo;
  if (!rawSeo || typeof rawSeo !== "object") {
    return null;
  }
  const value = (rawSeo as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function requestedSkuKey(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function requestedLengthMm(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function selectSku(product: Product, key?: string, diameter?: string | null, lengthMm?: number | null): SKU | null {
  return (
    product.skus.find((sku) => sku.id === key || sku.article === key || sku.slug === key) ??
    product.skus.find((sku) => productDiameterValue(sku) === diameter && sku.length_mm === lengthMm) ??
    product.skus.find((sku) => productDiameterValue(sku) === diameter) ??
    product.skus.find((sku) => sku.length_mm === lengthMm) ??
    product.skus[0] ??
    null
  );
}

function diameterLabel(sku: SKU | null) {
  if (!sku) {
    return null;
  }
  if (sku.diameter_mm !== null && sku.outer_diameter_mm !== null) {
    return `${sku.diameter_mm}×${sku.outer_diameter_mm} мм`;
  }
  const diameter = sku.diameter_mm ?? sku.outer_diameter_mm;
  return diameter === null ? null : `${diameter} мм`;
}

function applySeoTemplate(value: string, product: Product, sku: SKU | null) {
  const diameter = diameterLabel(sku) ?? "";
  const dimensions = sku
    ? [
        sku.diameter_mm !== null ? `d=${sku.diameter_mm} мм` : null,
        sku.outer_diameter_mm !== null ? `D=${sku.outer_diameter_mm} мм` : null,
        sku.length_mm !== null ? `L=${sku.length_mm} мм` : null,
        sku.wall_thickness_mm ? `S=${sku.wall_thickness_mm} мм` : null,
      ].filter(Boolean).join(", ")
    : "";
  const replacements: Record<string, string> = {
    "{name}": product.name,
    "{article}": sku?.article ?? "",
    "{D}": sku?.outer_diameter_mm?.toString() ?? "",
    "{d}": sku?.diameter_mm?.toString() ?? "",
    "{L}": sku?.length_mm?.toString() ?? "",
    "{S}": sku?.wall_thickness_mm ?? "",
    "{thickness}": sku?.wall_thickness_mm ?? "",
    "{steel}": sku?.steel_grade ?? product.steel_grade ?? "",
    "{material}": sku?.material ?? product.material ?? "",
    "{contour}": sku?.contour ?? product.contour ?? "",
    "{angle}": sku?.angle_deg?.toString() ?? "",
    "{insulation}": sku?.insulation_mm?.toString() ?? "",
    "{diameter}": diameter,
    "{dimensions}": dimensions,
  };
  return Object.entries(replacements)
    .reduce((result, [token, replacement]) => result.replaceAll(token, replacement), value)
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isLegacySkuSpecificSeo(value: string, product: Product) {
  if (product.skus.length <= 1 || /\{(?:d|D|diameter|dimensions)\}/.test(value)) {
    return false;
  }
  return /(?:Ø\s*)?\d{2,4}\s*[/×xх]\s*\d{2,4}/i.test(value);
}

function metadataTitle(product: Product, sku: SKU | null) {
  const skuTitle = skuSeoAttribute(sku, "seo_title");
  if (skuTitle) {
    return ensureDiameterInTitle(skuTitle, applySeoTemplate(skuTitle, product, sku), sku);
  }
  const customTitle = textAttribute(product, "seo_title");
  if (customTitle && !isLegacySkuSpecificSeo(customTitle, product)) {
    return ensureDiameterInTitle(customTitle, applySeoTemplate(customTitle, product, sku), sku);
  }
  const diameter = diameterLabel(sku);
  const length = sku?.length_mm ? `, L=${sku.length_mm}` : "";
  return `${product.name}${diameter ? ` ${diameter}` : ""}${length} — купить | Дымоход Трейд`;
}

function metadataDescription(product: Product, sku: SKU | null) {
  const skuDescription = skuSeoAttribute(sku, "seo_description");
  if (skuDescription) {
    return applySeoTemplate(skuDescription, product, sku).slice(0, 320);
  }
  const customDescription = textAttribute(product, "seo_description");
  const familyDescription = customDescription && !isLegacySkuSpecificSeo(customDescription, product)
    ? customDescription
    : product.short_description ?? product.description ?? product.name;
  const renderedFamilyDescription = applySeoTemplate(familyDescription, product, sku);
  if (!sku) {
    return renderedFamilyDescription.slice(0, 320);
  }
  const details = [
    diameterLabel(sku) ? `диаметр ${diameterLabel(sku)}` : null,
    sku.steel_grade ? `сталь ${sku.steel_grade}` : null,
    sku.wall_thickness_mm ? `толщина ${sku.wall_thickness_mm} мм` : null,
    sku.insulation_mm !== null ? `утепление ${sku.insulation_mm} мм` : null,
    `артикул ${sku.article}`,
  ].filter(Boolean);
  return `${renderedFamilyDescription.slice(0, 190)} Выбранный вариант: ${details.join(", ")}.`.slice(0, 320);
}

function productImage(product: Product, sku: SKU | null) {
  const skuMedia = sku?.attributes.sku_media;
  if (Array.isArray(skuMedia)) {
    const general = skuMedia.find(
      (value) =>
        value &&
        typeof value === "object" &&
        "url" in value &&
        "role" in value &&
        value.role === "general",
    );
    if (general && typeof general === "object" && "url" in general && typeof general.url === "string") {
      return absoluteUrl(general.url);
    }
  }
  const skuPhoto = sku?.attributes.sku_photo;
  if (skuPhoto && typeof skuPhoto === "object" && "url" in skuPhoto && typeof skuPhoto.url === "string") {
    return absoluteUrl(skuPhoto.url);
  }
  const media = product.extra_attributes.media;
  if (!Array.isArray(media)) {
    return null;
  }
  const item = media.find(
    (value) => value && typeof value === "object" && "url" in value && typeof value.url === "string",
  );
  return item && typeof item === "object" && "url" in item && typeof item.url === "string"
    ? absoluteUrl(item.url)
    : null;
}

function productJsonLd(product: Product, sku: SKU | null) {
  const familyUrl = absoluteUrl(`/product/${product.slug}`);
  const canonicalUrl = absoluteUrl(productPublicPath(product.slug, sku));
  const additionalProperty = sku
    ? [
        ["L", sku.length_mm],
        ["D", sku.outer_diameter_mm],
        ["d", sku.diameter_mm],
        ["S", sku.wall_thickness_mm],
        ["Толщина изоляции", sku.insulation_mm],
      ].flatMap(([name, value]) =>
        value === null
          ? []
          : [{ "@type": "PropertyValue", name, value: String(value), unitCode: "MMT" }],
      )
    : [];
  const image = productImage(product, sku);
  const availability = {
    in_stock: "https://schema.org/InStock",
    out_of_stock: "https://schema.org/OutOfStock",
    on_order: "https://schema.org/BackOrder",
  }[sku?.stock_status ?? ""];
  const offer = sku?.price_rub && Number(sku.price_rub) > 0
    ? {
        "@type": "Offer",
        url: canonicalUrl,
        priceCurrency: "RUB",
        price: sku.price_rub,
        availability,
      }
    : undefined;
  const variant = sku
    ? {
        "@type": "Product",
        name: skuSeoAttribute(sku, "h1") ?? sku.name,
        sku: sku.article,
        url: canonicalUrl,
        description: metadataDescription(product, sku),
        material: sku.steel_grade ?? sku.material ?? undefined,
        image: image ?? undefined,
        additionalProperty,
        offers: offer,
        isVariantOf: { "@id": `${familyUrl}#group` },
      }
    : undefined;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProductGroup",
        "@id": `${familyUrl}#group`,
        productGroupID: product.id,
        name: product.name,
        description: product.description ?? product.short_description ?? product.name,
        url: canonicalUrl,
        brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
        variesBy: ["https://schema.org/size", "https://schema.org/material"],
        hasVariant: variant ? [variant] : undefined,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Главная", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Каталог", item: absoluteUrl("/catalog") },
          {
            "@type": "ListItem",
            position: 3,
            name: product.category.name,
            item: absoluteUrl(`/catalog/${product.category.slug}`),
          },
          { "@type": "ListItem", position: 4, name: product.name, item: canonicalUrl },
        ],
      },
    ],
  };
}

export async function generateMetadata({ params, searchParams }: ProductPageProps): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const route = parseProductRoute(slug);
  const initialSkuKey = requestedSkuKey(query.sku) ?? route.legacySku ?? undefined;
  const initialLengthMm = requestedLengthMm(query.length);
  const product = await getProduct(route.familySlug, initialSkuKey, route.diameter);
  if (!product) {
    return { title: "Товар не найден | Дымоход Трейд" };
  }
  const sku = selectSku(product, initialSkuKey, route.diameter, initialLengthMm);
  const title = metadataTitle(product, sku);
  const description = metadataDescription(product, sku);
  const image = productImage(product, sku);
  const canonicalPath = productPublicPath(product.slug, sku);

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(canonicalPath) },
    robots: initialSkuKey || route.legacySku
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      type: "website",
      title,
      description,
      url: absoluteUrl(canonicalPath),
      images: image ? [{ url: image, alt: product.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const route = parseProductRoute(slug);
  const initialSkuKey = requestedSkuKey(query.sku) ?? route.legacySku ?? undefined;
  const initialLengthMm = requestedLengthMm(query.length);
  const product = await getProduct(route.familySlug, initialSkuKey, route.diameter);

  if (!product) {
    notFound();
  }

  const initialSku = selectSku(product, initialSkuKey, route.diameter, initialLengthMm);
  if (!initialSku) {
    notFound();
  }

  const canonicalPath = productPublicPath(product.slug, initialSku);
  const currentPath = `/product/${slug}`;
  if (currentPath !== canonicalPath || isUuidReference(initialSkuKey)) {
    const article = initialSkuKey && !isUuidReference(initialSkuKey) ? initialSku.article : null;
    redirect(productSelectionPath(product.slug, initialSku, article));
  }
  const jsonLd = productJsonLd(product, initialSku);

  return (
    <>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        type="application/ld+json"
      />
      <ProductExperience product={product} initialSkuKey={initialSku.id} />
    </>
  );
}
