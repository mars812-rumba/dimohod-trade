import Link from "next/link";
import { ArrowRight, ArrowUpRight, Calculator, Images, Package } from "lucide-react";
import { stoveProjectCosts } from "@/lib/stoveProjectCosts";
import { SolutionHouseGallery } from "./SolutionHouseGallery";
import styles from "./GuideArticlePage.module.css";
import costStyles from "./GuideProjectCosts.module.css";

const money = (value: number) => `${new Intl.NumberFormat("ru-RU").format(value)} ₽`;

export function GuideProjectCosts() {
  return (
    <section className={styles.section} aria-labelledby="project-costs-title">
      <h2 id="project-costs-title">Цена комплекта и стоимость всего объекта — не одно и то же</h2>
      <p>Комплект дымохода — одна строка сметы. Печь, монтаж, демонтаж, доставка и другие работы могут учитываться отдельно. Это видно на двух выполненных объектах.</p>
      {stoveProjectCosts.map(project => (
        <section className={costStyles.project} key={project.id} aria-labelledby={`project-cost-${project.id}`}>
          <h3 id={`project-cost-${project.id}`}>{project.name}</h3>
          <p>{project.context}</p>
          <div className={costStyles.tableWrap}>
          <table className={costStyles.table}>
            <caption>Стоимость по указанным позициям: {project.name}</caption>
            <thead><tr><th scope="col">Позиция</th><th scope="col">Сумма</th></tr></thead>
            <tbody>{project.lines.map(line => <tr key={line.label}><th scope="row">{line.label}</th><td>{money(line.amount)}</td></tr>)}</tbody>
            <tfoot><tr><th scope="row">Итого по указанным позициям</th><td>{money(project.total)}</td></tr></tfoot>
          </table>
          </div>
          <div className={costStyles.gallery}>
            <p className={costStyles.galleryLabel}>Фотографии объекта · {project.photos.length} фото</p>
            <SolutionHouseGallery
              images={project.photos}
              label={`Фотографии объекта: ${project.name}`}
              equalItems
              className={costStyles.photoGrid}
            />
          </div>
        </section>
      ))}
      <p>В СНТ «Звезда» комплект стоил 55 000 ₽, а итог с монтажом и демонтажом — 96 000 ₽. В Лампово комплект с покраской — 94 380 ₽, а итог с печью и остальными указанными позициями — 213 880 ₽.</p>
      <p>Сведения об объектах получены 5 октября 2026 года. Дата выполнения и дата, к которой относятся цены, не указаны. Эти суммы — примеры конкретных заказов, не действующий тариф и не цена комплекта для любого дома.</p>
      <p>Без подробного перечня изделий нельзя объяснить разницу между ценами двух комплектов или считать их взаимозаменяемыми. Доставка и расходники у «Звезды» отдельно не перечислены: это не означает, что они бесплатны или входят в указанную сумму.</p>
      <h3 className={costStyles.comparisonTitle}>Как сравнить две сметы перед покупкой</h3>
      <ul className={styles.articleList}>
        <li>Сопоставьте перечень изделий, количество, длины, диаметры, материалы и толщину — одной итоговой суммы недостаточно.</li>
        <li>Проверьте, что обе сметы относятся к одной модели отопителя и одному маршруту.</li>
        <li>Отдельно сравните монтаж, демонтаж, доставку, расходники и дополнительные работы. Не принимайте отсутствующую строку за нулевую стоимость.</li>
        <li>Уточните, какие позиции включены в итог и какие оплачиваются отдельно.</li>
      </ul>
      <nav className={costStyles.actions} aria-label="Каталог и расчёт комплекта">
        <Link className={`${costStyles.action} ${costStyles.catalogAction}`} href="/catalog/sendvich-truby">
          <Package aria-hidden size={22} />
          <span>Выбрать сэндвич-трубы в каталоге</span>
          <ArrowRight aria-hidden size={20} />
        </Link>
        <Link className={`${costStyles.action} ${costStyles.calculatorAction}`} href="/raschet">
          <Calculator aria-hidden size={22} />
          <span>Рассчитать свой комплект</span>
          <ArrowRight aria-hidden size={20} />
        </Link>
        <Link className={costStyles.photosAction} href="/solutions/dom#works-title">
          <Images aria-hidden size={20} />
          <span>Фотографии объектов на странице «Дымоход для дома»</span>
          <ArrowUpRight aria-hidden size={18} />
        </Link>
      </nav>
    </section>
  );
}
