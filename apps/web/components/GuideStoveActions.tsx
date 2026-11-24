import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";
import styles from "./GuideStoveActions.module.css";

export function GuideStoveActions() {
  return (
    <div className={styles.nextStep}>
      <Image
        className={styles.kitsImage}
        src={`${process.env.NEXT_BASE_PATH ?? ""}/images/guides/stove-ready-kits.webp`}
        alt="Иллюстрация маршрутов дымохода через стену и через кровлю"
        width={1280}
        height={853}
        sizes="(max-width: 860px) 100vw, 760px"
        quality={82}
      />
      <nav className={styles.actions} aria-label="Готовые комплекты для печи">
        <Link className={`${styles.action} ${styles.kitsAction}`} href="/komplekty">
          <Package aria-hidden size={22} />
          <span>Готовые комплекты: состав и цены</span>
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
