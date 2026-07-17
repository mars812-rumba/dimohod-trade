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
  if (value === null) {
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

const compatOk = [
  "Банные печи с диаметром патрубка 115 мм",
  "Камины с вкладышем диаметром 115 мм",
  "Твердотопливные котлы с диаметром 115 мм",
  "Монтаж через кровлю с проходным узлом",
  "Внутренняя прокладка по стене",
];

const compatNo = [
  "Газовые котлы с конденсатом без кислотостойкой стали",
  "Диаметр 120 мм без переходника",
  "Уличные холодные участки без утеплителя",
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
  const media = tempProductMedia[product.slug] ?? [];
  const activeImage = media[selectedImage] ?? media[0] ?? null;

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
              <img className="product-image" src={activeImage.src} alt={activeImage.alt} />
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
              {product.material ? (
                <div className="spec-row">
                  <span>Материал</span>
                  <strong>{product.material}</strong>
                </div>
              ) : null}
              {product.diameter_mm ? (
                <div className="spec-row">
                  <span>Внутренний диаметр</span>
                  <strong>{product.diameter_mm} мм</strong>
                </div>
              ) : null}
              {product.wall_thickness_mm ? (
                <div className="spec-row">
                  <span>Толщина стенки</span>
                  <strong>{product.wall_thickness_mm} мм</strong>
                </div>
              ) : null}
              <div className="spec-row">
                <span>Контур</span>
                <strong>Сэндвич, двустенный</strong>
              </div>
              <div className="spec-row">
                <span>Утепление</span>
                <strong>Базальтовая вата 50 мм</strong>
              </div>
              <div className="spec-row">
                <span>Максимальная температура</span>
                <strong>600 °C</strong>
              </div>
            </div>
          </section>

          <section className="product-section">
            <h2 className="product-section-title">Совместимость</h2>
            <div className="compat-grid">
              <div className="compat-block compat-ok">
                <p className="compat-label">
                  <CheckCircle2 size={15} /> Подходит для
                </p>
                <ul>
                  {compatOk.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="compat-block compat-no">
                <p className="compat-label">
                  <XCircle size={15} /> Не применять
                </p>
                <ul>
                  {compatNo.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
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
