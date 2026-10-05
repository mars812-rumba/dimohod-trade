import Link from "next/link";
import { installationTerms as terms } from "@/lib/installationTerms";
import styles from "./InstallationTermsSection.module.css";

export function InstallationTermsSection({ compact = false, fireplace = false }: { compact?: boolean; fireplace?: boolean }) {
  return (
    <section className={styles.section} id="installation-terms" aria-labelledby="installation-terms-title">
      <div className={styles.shell}>
        <h2 id="installation-terms-title">Как заказать дымоход с монтажом</h2>
        <p className={styles.intro}>Можно заказать комплект изделий или комплект с монтажом. {terms.team} {terms.geography}</p>
        {compact ? <>
          <p className={styles.intro}>Предварительный расчёт помогает определить состав. После отдельного платного замера согласуем окончательную стоимость. При сдаче — проверка работы системы, тестовая топка и акт.</p>
          <Link className={styles.link} href="/solutions/dom#installation-terms">Стоимость замера и условия монтажа</Link>
        </> : <>
          <div className={styles.layout}>
            <div>
              <h3>Замер и окончательная стоимость</h3>
              <p>{terms.measurement}</p>
              <dl className={styles.prices}>
                {terms.measurementPrices.map(item => <div key={item.distance}><dt>{item.distance}</dt><dd>{item.price}</dd></div>)}
              </dl>
              <p>{terms.price}</p>
              <p>{terms.manufacture}</p>
            </div>
            <div>
              <h3>Работы и сдача объекта</h3>
              <p>{terms.scope}</p>
              {fireplace ? <p>{terms.fireplace}</p> : null}
              <p>{terms.handover}</p>
              <h3>Гарантия на изделия и монтаж</h3>
              <p>{terms.productWarranty}</p>
              <p>{terms.installationWarranty}</p>
              <Link className={styles.link} href="/warranty">Условия гарантийного обращения</Link>
            </div>
          </div>
          <p className={styles.services}>{terms.additionalServices}</p>
        </>}
      </div>
    </section>
  );
}
