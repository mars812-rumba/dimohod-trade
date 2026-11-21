import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getReadyKit, kitMetadata, kitPath, kitRub } from "@/lib/readyKits";
import { Boxes, BadgeRussianRuble, Camera, ClipboardList, Ruler } from "lucide-react";
import { kitApplicationSections, kitChecklistIcon } from "@/lib/readyKitPresentation";
import { readyKitScheme } from "@/lib/readyKitScheme";
import { ReadyKitInquiry, ReadyKitPdf, ReadyKitSelectors } from "@/components/ReadyKitControls";
import { ReadyKitLineDetails } from "@/components/ReadyKitLineDetails";
import { ReadyKitRecommendations } from "@/components/ReadyKitRecommendations";
import { ReadyKitCustomRequest } from "@/components/ReadyKitCustomRequest";
import { ReadyKitTabs } from "@/components/ReadyKitTabs";
import { RouteImageViewer } from "@/components/RouteImageViewer";
import styles from "@/components/ReadyKit.module.css";

export const dynamic = "force-dynamic";
const readKit = cache(getReadyKit);
type Props = { params: Promise<{ slug: string }> };
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const site = process.env.NEXT_PUBLIC_APP_URL ?? "https://dimohod-trade.pro";
const absolute = (path: string) => new URL(`${base}${path}`, site).toString();

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await readKit((await params).slug);
  if (!data) notFound();
  const meta = kitMetadata(data.kit);
  return { ...meta, openGraph: { title: meta.title, description: meta.description, type: "website", url: kitPath(data.kit.slug), images: [{ url: absolute(data.kit.image_path), width: 1254, height: 1254 }] } };
}

export default async function ReadyKitPage({ params }: Props) {
  const data = await readKit((await params).slug);
  if (!data) notFound();
  const { kit, variants } = data;
  const content = kit.content;
  const route = kit.route === "roof" ? "Через перекрытие и кровлю" : "Через стену";
  const scheme = readyKitScheme(kit.route, kit.height_m);
  const application = kitApplicationSections(content?.application_description || kit.description, kit.route, kit.height_m);
  const schema = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: absolute("/") },
      { "@type": "ListItem", position: 2, name: "Готовые комплекты", item: absolute("/komplekty") },
      { "@type": "ListItem", position: 3, name: kit.name, item: absolute(kitPath(kit.slug)) },
    ] },
    { "@context": "https://schema.org", "@type": "Product", name: kit.name, description: content?.short_description || kit.description,
      image: absolute(kit.image_path), url: absolute(kitPath(kit.slug)),
      ...(kit.total_rub !== null ? { offers: { "@type": "Offer", url: absolute(kitPath(kit.slug)), priceCurrency: "RUB", price: kit.total_rub } } : {}),
    },
  ];
  return <main className={`${styles.page} ${styles.kitPage}`}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    <nav aria-label="Хлебные крошки" className={styles.breadcrumbs}><Link href="/">Главная</Link> / <Link href="/komplekty">Готовые комплекты</Link> / <span>{kit.height_m} м, Ø{kit.diameter_mm} мм</span></nav>
    <section className={styles.hero}>
      <div className={styles.visual}><img src={`${base}${kit.image_path}`} alt={`Иллюстрация маршрута: ${route.toLowerCase()}`} width={1254} height={1254} fetchPriority="high" /><small>Иллюстрация маршрута. Точный состав — в спецификации ниже.</small></div>
      <div className={styles.intro}>
        <p className="eyebrow">Готовый комплект · {route}</p>
        <h1>{kit.name}</h1>
        <div className={styles.badges}><span>Ø{kit.diameter_mm} мм</span><span>{kit.lines.length} позиций</span><span>Состав согласован</span></div>
        <p>{content?.short_description || kit.description}</p>
        <ReadyKitSelectors kit={kit} variants={variants} />
        <div className={styles.price}><small>Стоимость изделий по каталогу</small><strong>{kitRub(kit.total_rub)}</strong></div>
        {kit.unpriced_count > 0 ? <p role="status">Есть позиции без цены. Полную стоимость уточнит менеджер.</p> : null}
        <ReadyKitInquiry name={kit.name} slug={kit.slug} priced={kit.total_rub !== null} />
        <p className={styles.muted}>Без монтажа и доставки. Наличие и условия заказа уточняет менеджер.</p>
      </div>
    </section>
    <ReadyKitTabs key={kit.slug} panels={{
      bom: <section id="bom" className={styles.panel}>
        <h2>Полная спецификация комплекта</h2>
        {scheme ? <RouteImageViewer key={scheme} src={`${base}${scheme}`} alt={`Схема комплекта: ${route.toLowerCase()}, ${kit.height_m} м`}
          title={`${route} · ${kit.height_m} м`} previewLabel={`Посмотреть схему комплекта · ${kit.height_m} м`} previewSizes="48px" quality={88} /> : null}
        {content?.composition_description ? <p className={styles.muted}>{content.composition_description}</p> : null}
        <div className={styles.tableScroll}><table className={styles.table}>
          <thead><tr><th scope="col">Изделие и характеристики</th><th scope="col">Кол-во</th><th scope="col">Цена</th><th scope="col">Сумма</th></tr></thead>
          <tbody>{kit.lines.map((line, index) => <tr key={`${line.sku_id}-${index}`}>
            <td><ReadyKitLineDetails line={line} /></td>
            <td data-label="Количество"><span className={styles.moneyLabel}><Boxes aria-hidden size={13} />Количество</span>{line.quantity} шт.</td>
            <td data-label="Цена за шт."><span className={styles.moneyLabel}><BadgeRussianRuble aria-hidden size={13} />Цена за шт.</span>{kitRub(line.unit_price_rub)}</td>
            <td data-label="Сумма"><span className={styles.moneyLabel}><BadgeRussianRuble aria-hidden size={13} />Сумма</span>{kitRub(line.line_total_rub)}</td>
          </tr>)}</tbody>
        </table></div>
        <div className={styles.total}><span>Итого за комплект</span><strong>{kitRub(kit.total_rub)}</strong></div>
        <ReadyKitPdf kit={kit} />
      </section>,
      application: <section id="application" className={`${styles.panel} ${styles.reading}`}><h2>Применение и маршрут</h2>
        {application.map((section, index) => <section className={styles.readingSection} key={index}><h3>{section.title}</h3>{section.paragraphs.map((text, i) => <p key={i}>{text}</p>)}</section>)}
        <p>Для выбора по объекту и отопителю:</p><ul><li><Link href="/solutions/banya">Дымоход для бани →</Link></li><li><Link href="/solutions/dom">Дымоход для дома →</Link></li><li><Link href="/solutions/pech">Подбор дымохода к печи →</Link></li></ul><p className={styles.muted}>Сценарные страницы помогают уточнить задачу; ссылка не означает универсальную совместимость этого комплекта с любым отопителем.</p>
      </section>,
      conditions: <section id="conditions" className={`${styles.panel} ${styles.reading}`}><h2>Важные условия и ограничения</h2>
        <ul>{kit.limitations.map((text, index) => <li key={index}>{text}</li>)}</ul>
        {content?.selection_checklist.length ? <><h3>Что подготовить перед заказом</h3><ul className={styles.actionList}>{content.selection_checklist.map((text, index) => {
          const Icon = { camera: Camera, ruler: Ruler, clipboard: ClipboardList }[kitChecklistIcon(text)];
          return <li key={index}><Icon aria-hidden size={20} /><span>{text}</span></li>;
        })}</ul></> : null}<Link href="/contacts">Связаться со специалистом →</Link>
      </section>,
    }} />
    {content?.faq.length ? <section id="faq" className={styles.panel}>
      <h2>Вопросы и ответы</h2>
      {content.faq.map((item, index) => <details key={index} className={styles.faqItem}>
        <summary>{item.question}</summary><p>{item.answer}</p>
      </details>)}
    </section> : null}
    <ReadyKitRecommendations kit={kit} variants={variants} />
    <ReadyKitCustomRequest />
  </main>;
}
