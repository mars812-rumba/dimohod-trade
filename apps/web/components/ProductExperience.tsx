"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Barcode,
  Calculator,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Cog,
  FileText,
  Info,
  Layers3,
  Link2,
  ListChecks,
  Mail,
  MapPin,
  Package,
  PanelsTopLeft,
  Phone,
  Ruler,
  ShieldCheck,
  Target,
  Truck,
  Wrench,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { DimensionScheme } from "@/components/DimensionScheme";
import type { CompatibleProduct, Product } from "@/lib/api";

type ProductPhotoItem = {
  kind?: "photo";
  role: string;
  src: string;
  alt: string;
  fit?: "cover" | "contain";
};

type ProductSchemeItem = {
  kind: "scheme";
  role: string;
  alt: string;
};

type ProductMediaItem = ProductPhotoItem | ProductSchemeItem;

type VariantDimensionKey =
  | "diameter"
  | "length_mm"
  | "steel_grade"
  | "wall_thickness_mm"
  | "insulation_mm"
  | "angle_deg"
  | "material"
  | "contour";

type VariantDimension = {
  key: VariantDimensionKey;
  label: string;
  options: Array<{ value: string; label: string }>;
};

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

function compactDecimal(value: string | null) {
  if (!value) {
    return null;
  }
  return value.replace(/([.,]\d*?[1-9])0+$|[.,]0+$/, "$1").replace(".", ",");
}

function compatibleDiameterLabel(item: CompatibleProduct) {
  if (item.diameter_mm !== null && item.outer_diameter_mm !== null) {
    return `${item.diameter_mm}/${item.outer_diameter_mm} мм`;
  }
  const diameter = item.outer_diameter_mm ?? item.diameter_mm;
  return diameter !== null ? `${diameter} мм` : null;
}

function groupCompatibleProducts(items: CompatibleProduct[]) {
  const groups = new Map<string, CompatibleProduct[]>();
  items.forEach((item) => {
    const group = groups.get(item.product_id) ?? [];
    group.push(item);
    groups.set(item.product_id, group);
  });
  return Array.from(groups.values()).map((group) =>
    group.sort((left, right) =>
      (left.length_mm ?? Number.MAX_SAFE_INTEGER) - (right.length_mm ?? Number.MAX_SAFE_INTEGER),
    ),
  );
}

function familyCountLabel(count: number) {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return `${count} семейств`;
  }
  if (lastDigit === 1) {
    return `${count} семейство`;
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${count} семейства`;
  }
  return `${count} семейств`;
}

function CompatibleProductFamilyCard({ items }: { items: CompatibleProduct[] }) {
  const [selectedSkuId, setSelectedSkuId] = useState(items[0]?.sku_id ?? "");
  const selected = items.find((item) => item.sku_id === selectedSkuId) ?? items[0];
  if (!selected) {
    return null;
  }
  const lengthOptions = Array.from(
    new Map(
      items.flatMap((item) => item.length_mm === null ? [] : [[item.length_mm, item] as const]),
    ).values(),
  );
  const diameter = compatibleDiameterLabel(selected);

  return (
    <article className="compatible-product-card">
      <div className="compatible-product-media">
        {selected.primary_image ? (
          <img
            alt={selected.primary_image.alt ?? `${selected.product_name} — общий вид`}
            src={publicMediaUrl(selected.primary_image.url)}
          />
        ) : (
          <span className="compatible-product-placeholder">
            <Package aria-hidden="true" size={25} strokeWidth={1.7} />
            {selected.product_name}
          </span>
        )}
      </div>
      <div className="compatible-product-body">
        <strong>{selected.product_name}</strong>
        <small><Barcode aria-hidden="true" size={12} /> Арт. {selected.article}</small>
        <div className="compatible-product-specs">
          {diameter ? <span><CircleDot aria-hidden="true" size={13} /> {diameter}</span> : null}
          {selected.insulation_mm !== null ? (
            <span><Layers3 aria-hidden="true" size={13} /> утепление {selected.insulation_mm} мм</span>
          ) : null}
          {selected.steel_grade ? <span><Cog aria-hidden="true" size={13} /> {selected.steel_grade}</span> : null}
          {selected.material ? (
            <span><PanelsTopLeft aria-hidden="true" size={13} /> {materialLabel(selected.material)}</span>
          ) : null}
        </div>
        {lengthOptions.length > 1 ? (
          <div className="compatible-length-picker">
            <span><Ruler aria-hidden="true" size={13} /> Длина</span>
            <div>
              {lengthOptions.map((item) => (
                <button
                  aria-pressed={item.sku_id === selected.sku_id}
                  className={item.sku_id === selected.sku_id ? "active" : ""}
                  key={item.sku_id}
                  onClick={() => setSelectedSkuId(item.sku_id)}
                  type="button"
                >
                  {item.length_mm} мм
                </button>
              ))}
            </div>
          </div>
        ) : selected.length_mm !== null ? (
          <div className="compatible-single-length"><Ruler aria-hidden="true" size={13} /> L={selected.length_mm} мм</div>
        ) : null}
        <div className="compatible-product-footer">
          <b>{formatPrice(selected.price_rub)}</b>
          <Link href={`/product/${selected.product_slug}?sku=${encodeURIComponent(selected.sku_key)}`}>
            Открыть <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}

function materialKey(value: string | null) {
  if (!value) {
    return null;
  }
  const normalized = value.toLocaleLowerCase("ru-RU");
  if (normalized.includes("нерж") || normalized.includes("stainless")) {
    return "stainless";
  }
  if (normalized.includes("оцинк") || normalized.includes("galvan")) {
    return "galvanized";
  }
  return normalized.trim();
}

function materialLabel(value: string | null) {
  const key = materialKey(value);
  if (key === "stainless") {
    return "Нержавейка";
  }
  if (key === "galvanized") {
    return "Оцинковка";
  }
  return value;
}

function dimensionValue(sku: Product["skus"][number], key: VariantDimensionKey): string | null {
  if (key === "diameter") {
    if (sku.diameter_mm === null && sku.outer_diameter_mm === null) {
      return null;
    }
    return `${sku.diameter_mm ?? ""}:${sku.outer_diameter_mm ?? ""}`;
  }
  if (key === "material") {
    return materialKey(sku.material);
  }
  const value = sku[key];
  return value === null || value === "" ? null : String(value);
}

function dimensionLabel(sku: Product["skus"][number], key: VariantDimensionKey): string | null {
  if (key === "diameter") {
    if (sku.diameter_mm !== null && sku.outer_diameter_mm !== null && sku.diameter_mm !== sku.outer_diameter_mm) {
      return `${sku.diameter_mm}/${sku.outer_diameter_mm} мм`;
    }
    const diameter = sku.diameter_mm ?? sku.outer_diameter_mm;
    return diameter === null ? null : `${diameter} мм`;
  }
  if (key === "wall_thickness_mm") {
    const value = compactDecimal(sku.wall_thickness_mm);
    return value ? `${value} мм` : null;
  }
  if (key === "length_mm" || key === "insulation_mm") {
    const value = sku[key];
    return value === null ? null : `${value} мм`;
  }
  if (key === "angle_deg") {
    return sku.angle_deg === null ? null : `${sku.angle_deg}°`;
  }
  if (key === "material") {
    return materialLabel(sku.material);
  }
  return sku[key] || null;
}

const dimensionDefinitions: Array<{ key: VariantDimensionKey; label: string }> = [
  { key: "material", label: "Материал" },
  { key: "steel_grade", label: "Марка стали" },
  { key: "diameter", label: "Диаметр d/D" },
  { key: "length_mm", label: "Длина" },
  { key: "wall_thickness_mm", label: "Толщина стали" },
  { key: "insulation_mm", label: "Утепление" },
  { key: "angle_deg", label: "Угол" },
  { key: "contour", label: "Контур" },
];

function buildVariantDimensions(skus: Product["skus"]): VariantDimension[] {
  return dimensionDefinitions.flatMap((definition) => {
    const options = new Map<string, string>();
    for (const sku of skus) {
      const value = dimensionValue(sku, definition.key);
      const label = dimensionLabel(sku, definition.key);
      if (value && label) {
        options.set(value, label);
      }
    }
    if (options.size <= 1) {
      return [];
    }
    const collator = new Intl.Collator("ru", { numeric: true, sensitivity: "base" });
    return [
      {
        ...definition,
        options: Array.from(options, ([value, label]) => ({ value, label })).sort((left, right) =>
          collator.compare(left.label, right.label),
        ),
      },
    ];
  });
}

const faqItems = [
  {
    q: "Подойдет ли для банной печи?",
    a: "Для банных печей используются сэндвич-трубы с утеплителем 50 мм и температурным классом от 600 °C. Уточните диаметр патрубка вашей печи, и мы подберем конкретную серию.",
  },
  {
    q: "Чем AISI 304 отличается от 430?",
    a: "AISI 304 - нержавейка с никелем, устойчива к кислотному конденсату. AISI 430 дешевле и чаще применяется для сухих газов и менее агрессивных условий.",
  },
  {
    q: "Нужен ли проходной узел через деревянное перекрытие?",
    a: "Да, при проходе через горючие конструкции нужна противопожарная разделка. В калькуляторе этот узел будет добавляться автоматически по сценарию монтажа.",
  },
  {
    q: "Можно ли состыковать с другой серией или брендом?",
    a: "Совместимость по диаметру не гарантирует совместимость по типу соединения. Лучше составить список элементов, а мы проверим связку перед заказом.",
  },
];

const docs = [
  { icon: FileText, label: "Сертификат пожарной безопасности", note: "PDF" },
  { icon: ShieldCheck, label: "Паспорт изделия", note: "PDF" },
  { icon: FileText, label: "Инструкция по монтажу", note: "PDF" },
];

const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const publicApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const mediaRoleLabels: Record<string, string> = {
  general: "Основное",
  top: "Вид сверху",
  connection: "Соединение",
  connect: "Соединение",
  detail: "Деталь",
};

function mediaRoleLabel(role: string) {
  const normalizedRole = role.trim().toLowerCase();
  if (normalizedRole.startsWith("connect")) {
    return "Соединение";
  }
  return mediaRoleLabels[normalizedRole] ?? role;
}

function publicMediaUrl(url: string) {
  return url.startsWith("/media/") ? `${appBasePath}${url}` : url;
}

function sharedProductMedia(product: Product): ProductPhotoItem[] {
  const rawMedia = product.extra_attributes.media;
  if (!Array.isArray(rawMedia)) {
    return [];
  }

  return rawMedia.flatMap((item) => {
    if (!item || typeof item !== "object" || !("url" in item) || typeof item.url !== "string") {
      return [];
    }
    const rawRole = "role" in item && typeof item.role === "string" ? item.role : "Фото";
    const role = mediaRoleLabel(rawRole);
    const alt = "alt" in item && typeof item.alt === "string" ? item.alt : `${product.name} — ${role}`;
    return [
      {
        role,
        src: publicMediaUrl(item.url),
        alt,
        fit: "contain" as const,
      },
    ];
  });
}

function skuSpecificPhoto(sku: Product["skus"][number] | null): ProductPhotoItem | null {
  const value = sku?.attributes.sku_photo;
  if (!value || typeof value !== "object" || !("url" in value) || typeof value.url !== "string") {
    return null;
  }
  return {
    role: "Фото SKU",
    src: publicMediaUrl(value.url),
    alt:
      "alt" in value && typeof value.alt === "string"
        ? value.alt
        : `${sku.name} (${sku.article}) — общий вид`,
    fit: "contain",
  };
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`faq-item${open ? " faq-open" : ""}`}>
      <button className="faq-trigger" onClick={() => setOpen((value) => !value)} type="button">
        <span>{q}</span>
        <ChevronDown size={16} className="faq-chevron" />
      </button>
      {open ? <div className="faq-body">{a}</div> : null}
    </div>
  );
}

const seoSectionHeadings = new Set([
  "Назначение",
  "Где применяется",
  "Совместимость",
  "Варианты монтажа",
  "Что учитывать при подборе",
  "Пожарная безопасность",
  "Характеристики выбранного SKU",
  "Расчёт комплекта",
]);

const seoSectionIcons: Record<string, LucideIcon> = {
  "Назначение": Target,
  "Где применяется": MapPin,
  "Совместимость": Link2,
  "Варианты монтажа": Wrench,
  "Что учитывать при подборе": ListChecks,
  "Пожарная безопасность": ShieldCheck,
  "Характеристики выбранного SKU": Ruler,
  "Параметры выбранного варианта": Ruler,
  "Расчёт комплекта": Calculator,
};

function ProductCopyHeading({ title }: { title: string }) {
  const Icon = seoSectionIcons[title] ?? FileText;
  return (
    <h3 className="product-copy-heading">
      <span className="product-copy-heading-icon" aria-hidden="true">
        <Icon size={17} strokeWidth={2} />
      </span>
      <span>{title}</span>
    </h3>
  );
}

function ProductSeoDescription({ value, omitConfiguratorSection }: { value: string; omitConfiguratorSection: boolean }) {
  let insideConfiguratorSection = false;
  return (
    <div className="product-copy">
      {value.split(/\n+/).flatMap((rawLine, index) => {
        const line = rawLine.trim();
        if (!line) {
          return [];
        }
        const normalizedHeading = line.replace(/:$/, "");
        if (normalizedHeading === "Расчёт комплекта") {
          insideConfiguratorSection = true;
          return omitConfiguratorSection
            ? []
            : [<ProductCopyHeading key={`${index}-${line}`} title={normalizedHeading} />];
        }
        if (insideConfiguratorSection && omitConfiguratorSection) {
          return [];
        }
        return seoSectionHeadings.has(normalizedHeading)
          ? [<ProductCopyHeading key={`${index}-${line}`} title={normalizedHeading} />]
          : [<p key={`${index}-${line}`}>{line.replace(/\s*:?[\s]*\/#calculator\b/g, "")}</p>];
      })}
    </div>
  );
}

function seoConfiguratorCta(product: Product): { text: string; href: string } | null {
  const rawKnowledge = product.extra_attributes.seo_knowledge;
  if (!rawKnowledge || typeof rawKnowledge !== "object" || !("configuratorCta" in rawKnowledge)) {
    return null;
  }
  const rawCta = rawKnowledge.configuratorCta;
  if (!rawCta || typeof rawCta !== "object" || !("text" in rawCta) || !("href" in rawCta)) {
    return null;
  }
  return typeof rawCta.text === "string" && typeof rawCta.href === "string" && rawCta.text && rawCta.href
    ? { text: rawCta.text, href: rawCta.href }
    : null;
}

export function ProductExperience({ product, initialSkuKey }: { product: Product; initialSkuKey?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const initialSku =
    product.skus.find((sku) => sku.slug === initialSkuKey || sku.article === initialSkuKey || sku.id === initialSkuKey) ??
    product.skus[0] ??
    null;
  const initialCompatibleProducts = initialSku
    ? (product.compatible_products ?? []).filter((item) => item.source_sku_id === initialSku.id)
    : [];
  const [selectedSkuId, setSelectedSkuId] = useState<string | null>(initialSku?.id ?? null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [compatibleProducts, setCompatibleProducts] = useState(initialCompatibleProducts);
  const [isLoadingCompatibility, setIsLoadingCompatibility] = useState(false);
  const compatibilityCache = useRef(
    new Map<string, CompatibleProduct[]>(
      initialSku ? [[initialSku.id, initialCompatibleProducts]] : [],
    ),
  );
  const activeSku = product.skus.find((sku) => sku.id === selectedSkuId) ?? product.skus[0] ?? null;
  const variantDimensions = useMemo(() => buildVariantDimensions(product.skus), [product.skus]);

  useEffect(() => {
    if (initialSku) {
      setSelectedSkuId(initialSku.id);
    }
  }, [initialSku?.id]);

  useEffect(() => {
    compatibilityCache.current = new Map(
      initialSku ? [[initialSku.id, initialCompatibleProducts]] : [],
    );
    setCompatibleProducts(initialCompatibleProducts);
  }, [product.id]);

  useEffect(() => {
    if (!activeSku) {
      setCompatibleProducts([]);
      return;
    }
    const cached = compatibilityCache.current.get(activeSku.id);
    if (cached) {
      setCompatibleProducts(cached);
      setIsLoadingCompatibility(false);
      return;
    }

    const controller = new AbortController();
    const skuKey = activeSku.slug ?? activeSku.article;
    const apiPath = `/api/v1/products/${encodeURIComponent(product.slug)}/compatible?sku=${encodeURIComponent(skuKey)}`;
    const requestUrl = publicApiBaseUrl ? `${publicApiBaseUrl}${apiPath}` : `${appBasePath}${apiPath}`;
    setCompatibleProducts([]);
    setIsLoadingCompatibility(true);
    fetch(requestUrl, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Compatibility request failed: ${response.status}`);
        }
        return (await response.json()) as CompatibleProduct[];
      })
      .then((items) => {
        compatibilityCache.current.set(activeSku.id, items);
        setCompatibleProducts(items);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setCompatibleProducts([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingCompatibility(false);
        }
      });

    return () => controller.abort();
  }, [activeSku?.id, activeSku?.article, activeSku?.slug, product.slug]);
  const normalizedProductName = product.name.toLocaleLowerCase("ru-RU");
  const isDeflector = normalizedProductName.includes("дефлектор");
  const isConeTermination =
    normalizedProductName.includes("конус") &&
    (isDeflector || normalizedProductName.includes("оголовок"));
  const outerDiameter =
    activeSku?.outer_diameter_mm ??
    (typeof product.extra_attributes.outer_diameter_mm === "number"
      ? product.extra_attributes.outer_diameter_mm
      : null);
  const material = activeSku?.material ?? product.material;
  const steelGrade = activeSku?.steel_grade ?? product.steel_grade;
  const diameterMm = activeSku?.diameter_mm ?? product.diameter_mm;
  const wallThicknessMm = activeSku?.wall_thickness_mm ?? product.wall_thickness_mm;
  const contour = activeSku?.contour ?? product.contour;
  const insulationMm = activeSku?.insulation_mm ?? product.insulation_mm;
  const compatibilityMessages = activeSku?.compatibility_messages ?? [];
  const compatibleProductFamilies = groupCompatibleProducts(compatibleProducts);
  const hasCompatibleLengthChoices = compatibleProductFamilies.some(
    (items) => new Set(items.map((item) => item.length_mm).filter((value) => value !== null)).size > 1,
  );
  const configuratorCta = seoConfiguratorCta(product);
  const lengthMm = activeSku?.length_mm ?? null;
  const parametricAlt = `${product.name} ${outerDiameter ?? diameterMm ?? "—"} мм, L=${lengthMm ?? "—"} D=${
    outerDiameter ?? "—"
  } d=${diameterMm ?? "—"} S=${wallThicknessMm ?? "—"}, утепление=${insulationMm ?? "—"} мм, сталь ${
    steelGrade ?? "не указана"
  }`;
  const storedMedia = sharedProductMedia(product);
  const sharedPhotos = storedMedia;
  const skuPhoto = skuSpecificPhoto(activeSku);
  const productPhotos = skuPhoto ? [skuPhoto, ...sharedPhotos] : sharedPhotos;
  const media: ProductMediaItem[] = isConeTermination
    ? [
        ...productPhotos.slice(0, 3),
        {
          kind: "scheme",
          role: "Схема",
          alt: parametricAlt,
        },
      ]
    : productPhotos;
  const activeImage = media[selectedImage] ?? media[0] ?? null;
  const schemeDimensions = {
    L: lengthMm,
    D: outerDiameter,
    d: diameterMm,
    S: wallThicknessMm,
    insulation: insulationMm,
  };
  const variantSummary = activeSku
    ? [
        { label: "Артикул", value: activeSku.article },
        { label: "Внутренний диаметр", value: diameterMm !== null ? `${diameterMm} мм` : null },
        { label: "Наружный диаметр", value: outerDiameter !== null ? `${outerDiameter} мм` : null },
        { label: "Толщина стали", value: wallThicknessMm ? `${compactDecimal(wallThicknessMm)} мм` : null },
        { label: "Утепление", value: insulationMm !== null ? `${insulationMm} мм` : null },
        { label: "Материал", value: material },
        { label: "Марка стали", value: steelGrade },
      ].filter((item): item is { label: string; value: string } => Boolean(item.value))
    : [];

  function selectVariant(dimensionIndex: number, value: string) {
    if (!activeSku) {
      return;
    }
    const prefix = variantDimensions.slice(0, dimensionIndex);
    const dimension = variantDimensions[dimensionIndex];
    let candidates = product.skus.filter(
      (sku) =>
        dimensionValue(sku, dimension.key) === value &&
        prefix.every((item) => dimensionValue(sku, item.key) === dimensionValue(activeSku, item.key)),
    );
    if (!candidates.length) {
      candidates = product.skus.filter((sku) => dimensionValue(sku, dimension.key) === value);
    }
    const remaining = variantDimensions.slice(dimensionIndex + 1);
    const selected = candidates.sort((left, right) => {
      const leftScore = remaining.filter(
        (item) => dimensionValue(left, item.key) === dimensionValue(activeSku, item.key),
      ).length;
      const rightScore = remaining.filter(
        (item) => dimensionValue(right, item.key) === dimensionValue(activeSku, item.key),
      ).length;
      return rightScore - leftScore;
    })[0];
    if (!selected) {
      return;
    }
    setSelectedSkuId(selected.id);
    setSelectedImage(0);
    router.replace(`${pathname}?sku=${encodeURIComponent(selected.slug ?? selected.article)}`, { scroll: false });
  }

  return (
    <main className="page">
      <nav className="breadcrumb" aria-label="Навигация">
        <Link href="/">Главная</Link>
        <span aria-hidden>/</span>
        <Link href="/catalog">Каталог</Link>
        <span aria-hidden>/</span>
        <span>{product.category.name}</span>
      </nav>

      <div className="product-layout">
        <div className="product-main">
          <div className="product-image-wrap">
            {activeImage?.kind === "scheme" ? (
              <div className="product-dimension-scheme">
                <DimensionScheme
                  title={product.name}
                  dimensions={schemeDimensions}
                  steelGrade={steelGrade}
                  material={material}
                />
              </div>
            ) : activeImage ? (
              <img
                className={`product-image${activeImage.fit === "contain" ? " product-image-contain" : ""}`}
                src={activeImage.src}
                alt={activeImage.alt}
              />
            ) : (
              <div className="product-image-placeholder">
                <span>Фото товара</span>
              </div>
            )}
            <div className="product-image-badges">
              {product.application_tags.map((tag) => (
                <span className="chip" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
            {media.length > 1 ? (
              <div className="product-gallery-thumbs" aria-label="Галерея товара">
                {media.map((item, index) => (
                  <button
                    className={`product-thumb${selectedImage === index ? " product-thumb-active" : ""}`}
                    key={item.kind === "scheme" ? "dimension-scheme" : item.src}
                    onClick={() => setSelectedImage(index)}
                    type="button"
                  >
                    {item.kind === "scheme" ? (
                      <DimensionScheme
                        title={product.name}
                        dimensions={schemeDimensions}
                        steelGrade={steelGrade}
                        material={material}
                        compact
                      />
                    ) : (
                      <img src={item.src} alt="" aria-hidden="true" />
                    )}
                    <span>{item.role}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <p className="eyebrow product-eyebrow">{product.category.name}</p>
          <h1 className="product-title">{product.name}</h1>
          {product.short_description ? <p className="lead">{product.short_description}</p> : null}

          <section className="product-section">
            <h2 className="product-section-title">Характеристики</h2>
            <div className="specs-table">
              {material ? (
                <div className="spec-row">
                  <span>Материал</span>
                  <strong>{material}</strong>
                </div>
              ) : null}
              {steelGrade ? (
                <div className="spec-row">
                  <span>Марка стали</span>
                  <strong>{steelGrade}</strong>
                </div>
              ) : null}
              {diameterMm ? (
                <div className="spec-row">
                  <span>Внутренний диаметр</span>
                  <strong>{diameterMm} мм</strong>
                </div>
              ) : null}
              {outerDiameter ? (
                <div className="spec-row">
                  <span>Наружный диаметр</span>
                  <strong>{outerDiameter} мм</strong>
                </div>
              ) : null}
              {wallThicknessMm ? (
                <div className="spec-row">
                  <span>Толщина стенки</span>
                  <strong>{wallThicknessMm} мм</strong>
                </div>
              ) : null}
              {contour ? (
                <div className="spec-row">
                  <span>Контур</span>
                  <strong>{contour}</strong>
                </div>
              ) : null}
              {insulationMm !== null ? (
                <div className="spec-row">
                  <span>Утепление</span>
                  <strong>{insulationMm} мм</strong>
                </div>
              ) : null}
              {activeSku?.length_mm ? (
                <div className="spec-row">
                  <span>Длина</span>
                  <strong>{activeSku.length_mm} мм</strong>
                </div>
              ) : null}
              {activeSku?.angle_deg ? (
                <div className="spec-row">
                  <span>Угол</span>
                  <strong>{activeSku.angle_deg}°</strong>
                </div>
              ) : null}
              {product.max_temperature_c !== null ? (
                <div className="spec-row">
                  <span>Максимальная температура</span>
                  <strong>{product.max_temperature_c} °C</strong>
                </div>
              ) : null}
              {product.product_kind ? (
                <div className="spec-row">
                  <span>Тип элемента</span>
                  <strong>{product.product_kind}</strong>
                </div>
              ) : null}
            </div>
          </section>

          <section className="product-section">
            <h2 className="product-section-title">Совместимость</h2>
            {compatibilityMessages.length > 0 ? (
              <div className="compat-rule-list">
                {compatibilityMessages.map((message) => {
                  const Icon = message.severity === "error" ? XCircle : message.severity === "warning" ? Info : CheckCircle2;
                  return (
                    <div className={`compat-rule compat-rule-${message.severity}`} key={message.code}>
                      <Icon size={16} />
                      <div>
                        <strong>
                          {message.severity === "error"
                            ? "Запрет"
                            : message.severity === "warning"
                              ? "Требует внимания"
                              : "Подсказка"}
                        </strong>
                        <p>{message.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="compat-note">
                <Info size={15} />
                Для выбранного варианта пока нет специальных правил совместимости.
              </div>
            )}
            {product.compatibility_notes ? (
              <div className="compat-note">
                <Info size={15} />
                {product.compatibility_notes}
              </div>
            ) : null}
            {isLoadingCompatibility ? (
              <div className="compat-note" aria-live="polite">
                <Info size={15} />
                Подбираем совместимые изделия для выбранного варианта…
              </div>
            ) : null}
            {compatibleProducts.length > 0 ? (
              <div className="compatible-products-block">
                <div className="compatible-products-head">
                  <div>
                    <h3>Совместимые изделия</h3>
                    <p>
                      Показываем варианты из выбранных в админке семейств, которые подходят
                      к текущему SKU по правилам подбора.
                      {hasCompatibleLengthChoices ? " У труб длину можно выбрать прямо в карточке." : ""}
                    </p>
                  </div>
                  <span>{familyCountLabel(compatibleProductFamilies.length)}</span>
                </div>
                <div className="compatible-products-list">
                  {compatibleProductFamilies.map((items) => (
                    <CompatibleProductFamilyCard
                      items={items}
                      key={`${activeSku?.id}-${items[0]?.product_id}`}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          {product.description || variantSummary.length ? (
            <section className="product-section">
              <h2 className="product-section-title product-section-title-with-icon">
                <FileText aria-hidden="true" size={19} />
                Описание
              </h2>
              {product.description ? (
                <ProductSeoDescription value={product.description} omitConfiguratorSection={Boolean(configuratorCta)} />
              ) : null}
              {variantSummary.length ? (
                <div className="product-variant-block">
                  <ProductCopyHeading title="Параметры выбранного варианта" />
                  <dl className="product-variant-summary">
                    {variantSummary.map((item) => (
                      <div key={item.label}>
                        <dt>{item.label}</dt>
                        <dd>{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}
              {configuratorCta ? (
                <div className="product-configurator-block">
                  <ProductCopyHeading title="Расчёт комплекта" />
                  <p>{configuratorCta.text}</p>
                  <Link className="product-configurator-cta" href={configuratorCta.href}>
                    Рассчитать комплект
                  </Link>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="product-section">
            <h2 className="product-section-title">Документы</h2>
            <div className="doc-list">
              {docs.map((doc) => {
                const Icon = doc.icon;
                return (
                  <button key={doc.label} className="doc-row" type="button">
                    <Icon size={18} color="var(--accent)" />
                    <span className="doc-label">{doc.label}</span>
                    <span className="doc-note">{doc.note}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="product-section">
            <h2 className="product-section-title">Вопросы и ответы</h2>
            <div className="faq-list">
              {faqItems.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </section>

          <Link className="button secondary product-back-link" href="/catalog">
            <ArrowLeft size={16} /> Назад в каталог
          </Link>
        </div>

        <aside className="sku-panel">
          <div className="sku-price-block">
            {activeSku ? (
              <>
                <div className="sku-price">{formatPrice(activeSku.price_rub)}</div>
                <p className="sku-price-note">за штуку, включая НДС</p>
              </>
            ) : (
              <div className="sku-price-na">Цена по запросу</div>
            )}
          </div>

          {activeSku ? (
            <div className="variant-picker">
              <div className="variant-picker-head">
                <span>Выберите исполнение</span>
                <strong>{product.skus.length} вариантов</strong>
              </div>
              {variantDimensions.map((dimension, dimensionIndex) => {
                const prefix = variantDimensions.slice(0, dimensionIndex);
                const selectedValue = dimensionValue(activeSku, dimension.key) ?? "";
                const options = dimension.options.map((option) => ({
                  ...option,
                  disabled: !product.skus.some(
                    (sku) =>
                      dimensionValue(sku, dimension.key) === option.value &&
                      prefix.every(
                        (item) => dimensionValue(sku, item.key) === dimensionValue(activeSku, item.key),
                      ),
                  ),
                }));
                const usesMaterialButtons =
                  dimension.key === "material" &&
                  options.every((option) => option.value === "stainless" || option.value === "galvanized");
                return (
                  <fieldset
                    className={`variant-group variant-group-${dimension.key}`}
                    key={dimension.key}
                  >
                    <legend>{dimension.label}</legend>
                    {usesMaterialButtons ? (
                      <div className="variant-options variant-material-options">
                        {options.map((option) => {
                          const selected = selectedValue === option.value;
                          return (
                            <button
                              aria-pressed={selected}
                              className={`variant-option${selected ? " variant-option-active" : ""}`}
                              disabled={option.disabled}
                              key={option.value}
                              onClick={() => selectVariant(dimensionIndex, option.value)}
                              type="button"
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="variant-select-wrap">
                        <select
                          aria-label={dimension.label}
                          onChange={(event) => selectVariant(dimensionIndex, event.target.value)}
                          value={selectedValue}
                        >
                          {options.map((option) => (
                            <option disabled={option.disabled} key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown aria-hidden="true" size={16} />
                      </div>
                    )}
                  </fieldset>
                );
              })}
              {isConeTermination ? (
                <div className="variant-scheme-preview">
                  <div className="variant-scheme-graphic">
                    <DimensionScheme
                      title={product.name}
                      dimensions={schemeDimensions}
                      steelGrade={steelGrade}
                      material={material}
                      compact
                    />
                  </div>
                  <div className="variant-scheme-details">
                    <span>Размеры выбранного варианта</span>
                    <dl>
                      <div>
                        <dt>Диаметр d/D</dt>
                        <dd>
                          {diameterMm ?? "—"}/{outerDiameter ?? "—"} мм
                        </dd>
                      </div>
                      {lengthMm !== null ? (
                        <div>
                          <dt>Длина L</dt>
                          <dd>{lengthMm} мм</dd>
                        </div>
                      ) : null}
                      {wallThicknessMm ? (
                        <div>
                          <dt>Толщина S</dt>
                          <dd>{compactDecimal(wallThicknessMm)} мм</dd>
                        </div>
                      ) : null}
                      {insulationMm !== null ? (
                        <div>
                          <dt>Утепление</dt>
                          <dd>{insulationMm} мм</dd>
                        </div>
                      ) : null}
                    </dl>
                  </div>
                </div>
              ) : null}
              <div className="variant-current">
                <span>Выбрано</span>
                <strong>{activeSku.name}</strong>
                <small>Арт. {activeSku.article}</small>
              </div>
            </div>
          ) : null}

          <div className="sku-cta">
            <button className="button full-button" type="button">
              Оставить заявку
            </button>
            <button className="button secondary full-button" type="button">
              Добавить в комплект
            </button>
          </div>

          <div className="delivery-info">
            <div className="delivery-row">
              <Truck size={15} color="var(--ok)" />
              <span>Отправка из Санкт-Петербурга</span>
            </div>
            <div className="delivery-row">
              <CheckCircle2 size={15} color="var(--ok)" />
              <span>Наличие уточняется при заказе</span>
            </div>
          </div>

          <div className="panel-contact-block">
            <p>Нужна консультация по совместимости?</p>
            <a href="tel:+79650756555" className="panel-phone">
              <Phone size={14} /> +7 (965) 075-65-55
            </a>
            <a href="mailto:office@dimohod-trade.ru" className="panel-email">
              <Mail size={14} /> office@dimohod-trade.ru
            </a>
          </div>
        </aside>
      </div>
    </main>
  );
}
