import Link from "next/link";
import type { GuideEstimateExample as Estimate } from "@/lib/guideArticles";
import { guideDate, guideEstimateTotal } from "@/lib/guidePresentation";
import styles from "./GuideArticlePage.module.css";

const money = (value: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 2 }).format(value);

export function GuideEstimateExample({ example }: { example: Estimate }) {
  const total = guideEstimateTotal(example.lines);
  return (
    <section className={styles.section} aria-labelledby="estimate-example-title">
      <h2 id="estimate-example-title">{example.title}</h2>
      <p>Пример расчёта на <time dateTime={example.calculatedAt}>{guideDate(example.calculatedAt)}</time>. Цены и состав относятся к этому примеру; текущие исполнения смотрите в каталоге.</p>
      <ul>{example.context.map((item) => <li key={item}>{item}</li>)}</ul>
      <div className={styles.estimateTableWrap} role="region" aria-label="Состав примера комплекта" tabIndex={0}>
        <table className={styles.estimateTable}>
          <caption>Спецификация примера расчёта</caption>
          <thead><tr><th scope="col">Изделие и материал</th><th scope="col">Количество</th><th scope="col">Цена за шт.</th><th scope="col">Сумма</th></tr></thead>
          <tbody>{example.lines.map((line) => {
            const priced = guideEstimateTotal([line]);
            return <tr key={line.skuId}><td><Link href={line.href}>{line.name}</Link><br />{line.material}</td><td>{line.quantity}</td><td>{priced === null ? "Уточняется" : money(line.unitPriceRub!)}</td><td>{priced === null ? "Уточняется" : money(priced)}</td></tr>;
          })}</tbody>
          <tfoot><tr><th scope="row" colSpan={3}>{total === null ? "Стоимость требует уточнения" : "Итого по перечисленным изделиям"}</th><td>{total === null ? "—" : money(total)}</td></tr></tfoot>
        </table>
      </div>
      <p>{example.scope}</p>
      <p><a href={example.source.href}>{example.source.label}</a> — {example.source.note}</p>
    </section>
  );
}
