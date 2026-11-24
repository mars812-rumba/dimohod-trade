import Link from "next/link";
import { ArrowUpRight, Images } from "lucide-react";
import { stoveProjectCosts } from "@/lib/stoveProjectCosts";
import { SolutionHouseGallery } from "./SolutionHouseGallery";
import styles from "./GuideArticlePage.module.css";
import costStyles from "./GuideProjectCosts.module.css";

const money = (value: number) => `${new Intl.NumberFormat("ru-RU").format(value)}\u00a0₽`;

export function GuideProjectCosts() {
  return (
    <section className={styles.section} aria-labelledby="project-costs-title">
      <h2 id="project-costs-title">Сколько стоит комплект и весь заказ</h2>
      <p>Цена дымохода — часть расходов на установку печи. Помимо изделий, в заказ могут входить сама печь, монтаж, демонтаж старой трубы и доставка.</p>
      {stoveProjectCosts.map(project => (
        <section className={costStyles.project} key={project.id} aria-labelledby={`project-cost-${project.id}`}>
          <h3 id={`project-cost-${project.id}`}>{project.name}</h3>
          <p>{project.context}</p>
          <div className={costStyles.tableWrap}>
            <table className={costStyles.table}>
              <caption>Смета: {project.name}</caption>
              <thead><tr><th scope="col">Что входит в заказ</th><th scope="col">Сумма</th></tr></thead>
              <tbody>{project.lines.map(line => <tr key={line.label}><th scope="row">{line.label}</th><td>{money(line.amount)}</td></tr>)}</tbody>
              <tfoot><tr><th scope="row">Итого по смете</th><td>{money(project.total)}</td></tr></tfoot>
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
      <p>В СНТ «Звезда» комплект дымохода стоил {money(55000)}. Монтаж и демонтаж старого дымохода — ещё {money(41000)}. Всего по смете — {money(96000)}.</p>
      <p>В Лампово комплект дымохода с покраской стоил {money(94380)}. Вместе с печью, монтажом, материалами и доставкой заказ обошёлся в {money(213880)}.</p>
      <p>Рассчитать комплект для вашей печи поможет менеджер: уточнит маршрут дымохода, размеры дома и необходимые работы.</p>
      <h3 className={costStyles.comparisonTitle}>Как сравнить две сметы перед покупкой</h3>
      <ul className={styles.articleList}>
        <li>Сравните состав комплектов: изделия, количество, длины, диаметры, материалы и толщину металла.</li>
        <li>Убедитесь, что расчёты сделаны для одной печи и одного маршрута дымохода.</li>
        <li>Сверьте стоимость монтажа, демонтажа, доставки и расходников. Если какой-то услуги нет в смете, уточните, как она оплачивается.</li>
        <li>Попросите менеджера перечислить, что входит в итоговую цену и за что нужно доплатить.</li>
      </ul>
      <Link className={costStyles.photosAction} href="/solutions/dom#works-title">
        <Images aria-hidden size={20} />
        <span>Фотографии объектов на странице «Дымоход для дома»</span>
        <ArrowUpRight aria-hidden size={18} />
      </Link>
    </section>
  );
}
