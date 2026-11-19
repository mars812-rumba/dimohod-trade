import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getReadyKit, kitMetadata, kitPath, kitRub } from "@/lib/readyKits";
import { Boxes, BadgeRussianRuble } from "lucide-react";
import { ReadyKitInquiry, ReadyKitPdf, ReadyKitSelectors } from "@/components/ReadyKitControls";
import { ReadyKitLineDetails } from "@/components/ReadyKitLineDetails";
import { ReadyKitCard } from "@/components/ReadyKitCard";
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
  const route = kit.route === "roof" ? "Через перекрытие и кровлю" : "Через стену";
  const related = variants.filter(item => item.slug !== kit.slug);
  const schema = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: absolute("/") },
      { "@type": "ListItem", position: 2, name: "Готовые комплекты", item: absolute("/komplekty") },
      { "@type": "ListItem", position: 3, name: kit.name, item: absolute(kitPath(kit.slug)) },
    ] },
    { "@context": "https://schema.org", "@type": "Product", name: kit.name, description: kit.description,
      image: absolute(kit.image_path), url: absolute(kitPath(kit.slug)),
      ...(kit.total_rub !== null ? { offers: { "@type": "Offer", url: absolute(kitPath(kit.slug)), priceCurrency: "RUB", price: kit.total_rub } } : {}),
    },
  ];
  return <main className={styles.page}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    <nav aria-label="Хлебные крошки" className={styles.breadcrumbs}><Link href="/">Главная</Link> / <Link href="/komplekty">Готовые комплекты</Link> / <span>{kit.height_m} м, Ø{kit.diameter_mm} мм</span></nav>
    <section className={styles.hero}>
      <div className={styles.visual}><img src={`${base}${kit.image_path}`} alt={`Иллюстрация маршрута: ${route.toLowerCase()}`} width={1254} height={1254} fetchPriority="high" /><small>Иллюстрация маршрута. Точный состав — в спецификации ниже.</small></div>
      <div className={styles.intro}>
        <p className="eyebrow">Готовый комплект · {route}</p>
        <h1>{kit.name}</h1>
        <div className={styles.badges}><span>Ø{kit.diameter_mm} мм</span><span>{kit.lines.length} позиций</span><span>Состав согласован</span></div>
        <p>{kit.description}</p>
        <ReadyKitSelectors kit={kit} variants={variants} />
        <div className={styles.price}><small>Стоимость изделий по каталогу</small><strong>{kitRub(kit.total_rub)}</strong></div>
        {kit.unpriced_count > 0 ? <p role="status">Есть позиции без цены. Полную стоимость уточнит менеджер.</p> : null}
        <ReadyKitInquiry name={kit.name} slug={kit.slug} priced={kit.total_rub !== null} />
        <p className={styles.muted}>Без монтажа и доставки. Наличие и условия заказа уточняет менеджер.</p>
      </div>
    </section>
    <nav className={styles.tabs} aria-label="Разделы комплекта"><a href="#bom">Состав комплекта</a><a href="#application">Применение</a><a href="#conditions">Что важно уточнить</a><a href="#related">Похожие комплекты</a></nav>
    <div className={styles.details}>
      <section id="bom" className={styles.panel}>
        <h2>Полная спецификация комплекта</h2>
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
      </section>
      <aside>
        <section id="application" className={styles.panel}><h2>Применение и маршрут</h2><p>{kit.description}</p><p>Для выбора по объекту и отопителю:</p><ul><li><Link href="/solutions/banya">Дымоход для бани →</Link></li><li><Link href="/solutions/dom">Дымоход для дома →</Link></li><li><Link href="/solutions/pech">Подбор дымохода к печи →</Link></li></ul><p className={styles.muted}>Сценарные страницы помогают уточнить задачу; ссылка не означает универсальную совместимость этого комплекта с любым отопителем.</p></section>
        <section id="conditions" className={styles.panel}><h2>Важные условия и ограничения</h2><ul>{kit.limitations.map((text, index) => <li key={index}>{text}</li>)}</ul><Link href="/contacts">Связаться со специалистом →</Link></section>
      </aside>
    </div>
    <section id="related" className={styles.heading}><h2>Похожие комплекты</h2><div className={styles.cards}>{related.map(item => <ReadyKitCard key={item.slug} kit={item} />)}</div></section>
  </main>;
}
