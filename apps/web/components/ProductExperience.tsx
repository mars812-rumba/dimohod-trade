"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  FileText,
  Info,
  Mail,
  Phone,
  ShieldCheck,
  Truck,
  XCircle,
} from "lucide-react";
import { DimensionScheme } from "@/components/DimensionScheme";
import type { Product } from "@/lib/api";

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
  { key: "diameter", label: "Диаметр d/D" },
  { key: "steel_grade", label: "Марка стали" },
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
    const role = "role" in item && typeof item.role === "string" ? item.role : "Фото";
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

function ProductSeoDescription({ value }: { value: string }) {
  return (
    <div className="product-copy">
      {value.split(/\n+/).flatMap((rawLine, index) => {
        const line = rawLine.trim();
        if (!line) {
          return [];
        }
        const normalizedHeading = line.replace(/:$/, "");
        return seoSectionHeadings.has(normalizedHeading)
          ? [<h3 className="product-copy-heading" key={`${index}-${line}`}>{normalizedHeading}</h3>]
          : [<p key={`${index}-${line}`}>{line}</p>];
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
  const [selectedSkuId, setSelectedSkuId] = useState<string | null>(initialSku?.id ?? null);
  const [selectedImage, setSelectedImage] = useState(0);
  const activeSku = product.skus.find((sku) => sku.id === selectedSkuId) ?? product.skus[0] ?? null;
  const variantDimensions = useMemo(() => buildVariantDimensions(product.skus), [product.skus]);

  useEffect(() => {
    if (initialSku) {
      setSelectedSkuId(initialSku.id);
    }
  }, [initialSku?.id]);
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
          role: "Схема размеров",
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
  const variantDescription = activeSku
    ? `${product.name}: внутренний диаметр ${diameterMm ?? "не указан"} мм${
        outerDiameter ? `, наружный диаметр ${outerDiameter} мм` : ""
      }${steelGrade ? `, сталь ${steelGrade}` : ""}${wallThicknessMm ? ` толщиной ${compactDecimal(wallThicknessMm)} мм` : ""}${
        insulationMm !== null ? `, утепление ${insulationMm} мм` : ""
      }. Артикул ${activeSku.article}.`
    : null;

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
          </section>

          {product.description || variantDescription ? (
            <section className="product-section">
              <h2 className="product-section-title">Описание</h2>
              {product.description ? <ProductSeoDescription value={product.description} /> : null}
              {variantDescription ? <p className="product-variant-copy">{variantDescription}</p> : null}
              {configuratorCta ? (
                <Link className="product-configurator-cta" href={configuratorCta.href}>
                  {configuratorCta.text}
                </Link>
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
                  <fieldset className="variant-group" key={dimension.key}>
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
