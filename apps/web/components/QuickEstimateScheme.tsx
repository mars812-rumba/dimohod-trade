import type { ChimneyCalculation } from "@/lib/chimneyCalculation";
import type { QuickEstimateAnswers } from "@/lib/homeQuickEstimate";
import { GeneratedChimneyScheme } from "./ChimneyConfigurator";
import styles from "./QuickEstimateScheme.module.css";

type QuickEstimateSchemeProps = {
  answers: QuickEstimateAnswers;
  calculation: ChimneyCalculation;
};

export function QuickEstimateScheme({ answers, calculation }: QuickEstimateSchemeProps) {
  const routeTitle = answers.route === "ceiling"
    ? "Через перекрытия и кровлю"
    : "Через стену и вверх по фасаду";

  return <section className={styles.panel} aria-labelledby="quick-scheme-heading">
    <header className={styles.header}>
      <div>
        <h4 id="quick-scheme-heading">Предварительная схема дымохода</h4>
        <p>{routeTitle}</p>
      </div>
      <span>Типовая геометрия</span>
    </header>
    <div className={`${styles.professionalScheme} ${answers.route === "ceiling" ? styles.ceiling : styles.wall}`}>
      <GeneratedChimneyScheme
        calculation={calculation}
        variant={calculation.selectedVariant}
        roofType="pitched"
        roofThicknessMm={calculation.roofThicknessMm}
      />
    </div>
    <p className={styles.note}>
      Схема показывает принцип трассы по типовым размерам. Перед изготовлением менеджер уточнит геометрию объекта.
    </p>
  </section>;
}
