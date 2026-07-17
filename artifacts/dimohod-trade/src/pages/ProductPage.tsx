import { Link, useParams } from "wouter";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Phone,
  Mail,
  FileText,
  ShieldCheck,
  Truck,
  Package,
  Info,
} from "lucide-react";
import { useProduct } from "@/lib/api";
import { useState } from "react";

function formatPrice(value: string | null) {
  if (value === null) return "Цена по запросу";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

const STATIC_FAQ = [
  {
    q: "Подойдёт ли для банной печи?",
    a: "Для банных печей используются сэндвич-трубы с утеплителем 50 мм и температурным классом от 600 °C. Уточните диаметр патрубка вашей печи — мы подберём конкретную серию.",
  },
  {
    q: "Чем AISI 304 отличается от 430?",
    a: "AISI 304 — нержавейка с никелем, устойчива к кислотному конденсату. Подходит для газа, камина и умеренных нагрузок. AISI 430 — ферритная сталь, дешевле, рекомендована для сухих газов и открытых участков. Для газовых котлов с конденсатом — только 304 или 316L.",
  },
  {
    q: "Нужен ли проходной узел через деревянное перекрытие?",
    a: "Да, обязательно. СП 7.13130 требует противопожарной разделки при проходе через горючие конструкции. Мы включаем проходной узел в спецификацию автоматически при выборе сценария с деревянным перекрытием.",
  },
  {
    q: "Можно ли состыковать с другой серией или брендом?",
    a: "Совместимость по диаметру не гарантирует совместимость по типу соединения (раструб/муфта). Мы не рекомендуем смешивать серии без консультации — лучше составьте список элементов и мы проверим.",
  },
  {
    q: "Что входит в гарантию?",
    a: "Гарантия распространяется на дефекты материала и изготовления при соблюдении условий монтажа и эксплуатации: допустимая температура, отсутствие механических повреждений, правильный монтаж с уклонами и хомутами согласно инструкции.",
  },
];

const COMPAT_OK = [
  "Банные печи с диаметром патрубка 115 мм",
  "Камины с вкладышем диаметром 115 мм",
  "Твердотопливные котлы с диаметром 115 мм",
  "Монтаж через кровлю с проходным узлом",
  "Внутренняя прокладка по стене",
];

const COMPAT_NO = [
  "Газовые котлы с конденсатом (нужна AISI 316L)",
  "Диаметр 120 мм без переходника",
  "Применение без утеплителя на уличных участках ниже −20 °C",
];

const DOCS = [
  { icon: FileText, label: "Сертификат пожарной безопасности", note: "PDF, 245 КБ" },
  { icon: ShieldCheck, label: "Паспорт изделия", note: "PDF, 112 КБ" },
  { icon: FileText, label: "Инструкция по монтажу", note: "PDF, 890 КБ" },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item${open ? " faq-open" : ""}`}>
      <button className="faq-trigger" onClick={() => setOpen((v) => !v)}>
        <span>{q}</span>
        <ChevronDown size={16} className="faq-chevron" />
      </button>
      {open && <div className="faq-body">{a}</div>}
    </div>
  );
}

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";
  const { data: product, isLoading, error } = useProduct(slug);
  const [selectedSku, setSelectedSku] = useState<number | null>(null);

  if (isLoading) {
    return (
      <main className="page">
        <div className="state-empty">Загружаем товар…</div>
      </main>
    );
  }

  if (error?.message === "not_found") {
    return (
      <main className="page">
        <div className="state-empty">Товар не найден.</div>
        <Link className="button secondary" href="/catalog">
          <ArrowLeft size={16} /> В каталог
        </Link>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="page">
        <div className="state-empty">Не удалось загрузить товар.</div>
      </main>
    );
  }

  const activeSku = selectedSku !== null ? product.skus[selectedSku] : (product.skus[0] ?? null);

  return (
    <main className="page">
      {/* Breadcrumb */}
      <nav className="breadcrumb" aria-label="Навигация">
        <Link href="/">Главная</Link>
        <span aria-hidden>/</span>
        <Link href="/catalog">Каталог</Link>
        <span aria-hidden>/</span>
        <span>{product.category.name}</span>
      </nav>

      <div className="product-layout">
        {/* ── ЛЕВАЯ КОЛОНКА ── */}
        <div className="product-main">
          {/* Фото-заглушка */}
          <div className="product-image-wrap">
            <div className="product-image-placeholder">
              <Package size={48} color="var(--line)" />
              <span>Фото товара</span>
            </div>
            <div className="product-image-badges">
              {product.application_tags.map((tag) => (
                <span className="chip" key={tag}>{tag}</span>
              ))}
            </div>
          </div>

          {/* Название и категория */}
          <p className="eyebrow" style={{ marginTop: 24 }}>{product.category.name}</p>
          <h1 className="product-title">{product.name}</h1>
          {product.short_description && (
            <p className="lead">{product.short_description}</p>
          )}

          {/* Характеристики */}
          <section className="product-section">
            <h2 className="product-section-title">Характеристики</h2>
            <div className="specs-table">
              {product.material && (
                <div className="spec-row">
                  <span>Материал</span>
                  <strong>{product.material}</strong>
                </div>
              )}
              {product.diameter_mm && (
                <div className="spec-row">
                  <span>Внутренний диаметр</span>
                  <strong>{product.diameter_mm} мм</strong>
                </div>
              )}
              {product.wall_thickness_mm && (
                <div className="spec-row">
                  <span>Толщина стенки</span>
                  <strong>{product.wall_thickness_mm} мм</strong>
                </div>
              )}
              <div className="spec-row">
                <span>Контур</span>
                <strong>Сэндвич (двустенный)</strong>
              </div>
              <div className="spec-row">
                <span>Утепление</span>
                <strong>Базальтовая вата 50 мм</strong>
              </div>
              <div className="spec-row">
                <span>Максимальная температура</span>
                <strong>600 °C</strong>
              </div>
              <div className="spec-row">
                <span>Соединение</span>
                <strong>Раструбное</strong>
              </div>
            </div>
          </section>

          {/* Совместимость */}
          <section className="product-section">
            <h2 className="product-section-title">Совместимость</h2>
            <div className="compat-grid">
              <div className="compat-block compat-ok">
                <p className="compat-label">
                  <CheckCircle2 size={15} /> Подходит для
                </p>
                <ul>
                  {COMPAT_OK.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="compat-block compat-no">
                <p className="compat-label">
                  <XCircle size={15} /> Не применять
                </p>
                <ul>
                  {COMPAT_NO.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
            {product.compatibility_notes && (
              <div className="compat-note">
                <Info size={15} />
                {product.compatibility_notes}
              </div>
            )}
          </section>

          {/* Описание */}
          {product.description && (
            <section className="product-section">
              <h2 className="product-section-title">Описание</h2>
              <p style={{ lineHeight: 1.65 }}>{product.description}</p>
            </section>
          )}

          {/* Документы */}
          <section className="product-section">
            <h2 className="product-section-title">Документы</h2>
            <div className="doc-list">
              {DOCS.map((doc) => {
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

          {/* FAQ */}
          <section className="product-section">
            <h2 className="product-section-title">Вопросы и ответы</h2>
            <div className="faq-list">
              {STATIC_FAQ.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </section>

          <Link className="button secondary" href="/catalog" style={{ marginTop: 8 }}>
            <ArrowLeft size={16} /> Назад в каталог
          </Link>
        </div>

        {/* ── ПРАВАЯ КОЛОНКА (sticky) ── */}
        <aside className="sku-panel">
          {/* Цена и CTA */}
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

          {/* Выбор SKU */}
          {product.skus.length > 0 && (
            <div className="sku-list">
              <p className="sku-list-label">Варианты</p>
              {product.skus.map((sku, i) => (
                <button
                  key={sku.id}
                  className={`sku-btn${selectedSku === i || (selectedSku === null && i === 0) ? " sku-btn-active" : ""}`}
                  onClick={() => setSelectedSku(i)}
                  type="button"
                >
                  <span className="sku-btn-name">{sku.name}</span>
                  <span className="sku-btn-art">Арт. {sku.article}</span>
                  <span className="sku-btn-price">{formatPrice(sku.price_rub)}</span>
                </button>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="sku-cta">
            <button className="button" style={{ width: "100%", justifyContent: "center" }} type="button">
              Оставить заявку
            </button>
            <button className="button secondary" style={{ width: "100%", justifyContent: "center" }} type="button">
              Добавить в комплект
            </button>
          </div>

          {/* Доставка */}
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

          {/* Контакты на панели */}
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
