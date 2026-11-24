import Link from "next/link";
import { ArrowRight, Calculator, Package } from "lucide-react";
import styles from "./GuideStoveActions.module.css";

export function GuideStoveActions() {
  return (
    <div className={styles.nextStep}>
      <nav className={styles.actions} aria-label="Готовые комплекты и расчёт для печи">
        <Link className={`${styles.action} ${styles.kitsAction}`} href="/komplekty">
          <Package aria-hidden size={22} />
          <span>Готовые комплекты: состав и цены</span>
          <ArrowRight aria-hidden size={20} />
        </Link>
        <Link className={`${styles.action} ${styles.calculatorAction}`} href="/raschet">
          <Calculator aria-hidden size={22} />
          <span>Рассчитать свой комплект</span>
          <ArrowRight aria-hidden size={20} />
        </Link>
      </nav>
      <p className={styles.note}>Подключение к конкретной печи и условия дома нужно проверить отдельно.</p>
      <Link className={styles.catalogLink} href="/catalog/sendvich-truby">
        Выбрать отдельные сэндвич-трубы в каталоге <ArrowRight aria-hidden size={18} />
      </Link>
    </div>
  );
}
