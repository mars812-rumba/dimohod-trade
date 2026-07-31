"use client";

import Link from "next/link";
import { useState } from "react";
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
import type { Product } from "@/lib/api";

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

const tempProductMedia: Record<
  string,
  Array<{
    role: string;
    src: string;
    alt: string;
    fit?: "cover" | "contain";
  }>
> = {
  "sendvich-truba-115-200-nerzhaveyushchaya-stal-08": [
    {
      role: "Фото",
      src: "/dimohod-media/catalog/products/sendvich-truba-115-200-nerzhaveyushchaya-stal-08/photos/main.png",
      alt: "Сэндвич-труба 115/200, нержавеющая сталь, товарное фото",
    },
    {
      role: "Размеры",
      src: "/dimohod-media/catalog/products/sendvich-truba-115-200-nerzhaveyushchaya-stal-08/photos/dimensions.png",
      alt: "Чертеж размеров сэндвич-трубы 115/200",
    },
    {
      role: "Монтаж",
      src: "/dimohod-media/catalog/products/sendvich-truba-115-200-nerzhaveyushchaya-stal-08/photos/installed.png",
      alt: "Сэндвич-труба 115/200 в установленном дымоходе",
    },
  ],
};

const deflectorMedia = [
  {
    role: "Фото",
    src: "/dimohod-media/catalog/products/deflectors/photos/main.jpg",
    alt: "Дефлектор дымохода из нержавеющей стали, товарное фото",
    fit: "contain" as const,
  },
];

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

export function ProductExperience({ product }: { product: Product }) {
  const [selectedSku, setSelectedSku] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);
  const activeSku = product.skus[selectedSku] ?? product.skus[0] ?? null;
  const isDeflector = product.name.toLocaleLowerCase("ru-RU").includes("дефлектор");
  const media = tempProductMedia[product.slug] ?? (isDeflector ? deflectorMedia : []);
  const activeImage = media[selectedImage] ?? media[0] ?? null;
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
            {activeImage ? (
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
                    key={item.src}
                    onClick={() => setSelectedImage(index)}
                    type="button"
                  >
                    <img src={item.src} alt="" aria-hidden="true" />
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

          {product.description ? (
            <section className="product-section">
              <h2 className="product-section-title">Описание</h2>
              <p className="product-copy">{product.description}</p>
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

          {product.skus.length > 0 ? (
            <div className="sku-list">
              <p className="sku-list-label">Варианты</p>
              {product.skus.map((sku, index) => (
                <button
                  key={sku.id}
                  className={`sku-btn${selectedSku === index ? " sku-btn-active" : ""}`}
                  onClick={() => setSelectedSku(index)}
                  type="button"
                >
                  <span className="sku-btn-name">{sku.name}</span>
                  <span className="sku-btn-art">Арт. {sku.article}</span>
                  <span className="sku-btn-price">{formatPrice(sku.price_rub)}</span>
                </button>
              ))}
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
