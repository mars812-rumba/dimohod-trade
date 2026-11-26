import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calculator, Package } from "lucide-react";
import type { GuideImage } from "@/lib/guideArticles";
import { routeComparisonKits, routeKitPriceDate, routeKitTotalKopecks } from "@/lib/guideRouteComparison";
import styles from "./GuideRouteComparison.module.css";

const rows = [
  ["Сэндвич-секции 1000 мм", "6 шт.", "6 шт."],
  ["Дополнительный участок", "Сэндвич 750 мм", "Одностенная труба 1000 мм"],
  ["Тройник 90° и секция 250 мм", "Есть", "—"],
  ["Проходные стаканы", "1 шт.", "2 шт."],
  ["Комплекты ваты", "1 шт.", "2 шт."],
  ["Фланцы 600 × 600 мм", "2 шт.", "4 шт."],
  ["Опоры и крепления", "Площадка, 3 консоли, 2 силовых хомута", "Хомут в перекрытие"],
  ["Мастер-флеш", "—", "1 шт."],
  ["Шибер, опорная заглушка и дефлектор-конус", "По 1 шт.", "По 1 шт."],
] as const;

export function GuideImagePair({ images }: { images: readonly GuideImage[] }) {
  const base = process.env.NEXT_BASE_PATH ?? "";
  return <div className={styles.images}>
    {images.map(image => <figure key={image.src}>
      <Image src={`${base}${image.src}`} alt={image.alt} width={image.width ?? 960} height={image.height ?? 1280}
        sizes="(max-width: 560px) calc(100vw - 28px), (max-width: 860px) 45vw, 350px" />
      <figcaption>{image.caption}</figcaption>
    </figure>)}
  </div>;
}

export function GuideRouteSchemes() {
  const base = process.env.NEXT_BASE_PATH ?? "";
  return <figure className={styles.illustration}>
    <Image src={`${base}/images/guides/wall-or-roof-comparison.webp`}
      alt="Два дома в разрезе: слева дымоход через стену, справа — через перекрытие и крышу"
      width={1280} height={720} sizes="(max-width: 860px) calc(100vw - 28px), 760px" />
    <figcaption>Два маршрута дымохода — через стену и через перекрытие и крышу</figcaption>
  </figure>;
}

export function GuideRoutePrices() {
  const money = (value: number) => new Intl.NumberFormat("ru-RU", {
    style: "currency", currency: "RUB", minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(value / 100);
  return <div className={styles.tableWrap}>
    <table className={styles.table}>
      <caption>Готовые комплекты Ø115 мм · 6 м · цены на <time dateTime={routeKitPriceDate}>24 ноября 2026 года</time></caption>
      <colgroup><col className={styles.labelColumn} /><col /><col /></colgroup>
      <thead><tr><th scope="col">В составе</th><th scope="col">Через стену</th><th scope="col">Через перекрытие и кровлю</th></tr></thead>
      <tbody>{rows.map(([label, wall, roof]) => <tr key={label}><th scope="row">{label}</th><td>{wall}</td><td>{roof}</td></tr>)}</tbody>
      <tfoot>
        <tr><th scope="row">Цена изделий без монтажа</th>{routeComparisonKits.map(kit => <td key={kit.slug} className={styles.price}>{money(routeKitTotalKopecks(kit))}</td>)}</tr>
        <tr><th scope="row">Полный состав</th>{routeComparisonKits.map(kit => <td key={kit.slug}><Link href={`/komplekty/${kit.slug}`}>Открыть <ArrowRight size={14} aria-hidden /></Link></td>)}</tr>
      </tfoot>
    </table>
  </div>;
}

export function GuideRouteActions() {
  return <nav className={styles.actions} aria-label="Подобрать комплект дымохода">
    <Link href="/komplekty"><Package size={20} aria-hidden /><span>Посмотреть готовые комплекты</span><ArrowRight size={18} aria-hidden /></Link>
    <Link href="/bystryy-raschet"><Calculator size={20} aria-hidden /><span>Рассчитать дымоход для своего дома</span><ArrowRight size={18} aria-hidden /></Link>
  </nav>;
}
