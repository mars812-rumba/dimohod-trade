import Link from "next/link";
import {
  IconArrowRight,
  IconBolt,
  IconRulerMeasure,
} from "@tabler/icons-react";
import styles from "./page.module.css";

export default function CalculationChoicePage() {
  return (
    <main className={styles.main}>
      <div className={styles.shell}>
        <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">Выбор формата</span>
        </nav>

        <header className={styles.intro}>
          <h1>Что вам нужно сейчас?</h1>
          <p>
            Выберите путь по своей ситуации. Быстрый расчёт покажет порядок бюджета,
            а глубокий замер подготовит данные для реального заказа.
          </p>
        </header>

        <section className={styles.choiceLayout} aria-label="Форматы расчёта дымохода">
          <article className={styles.exactChoice}>
            <div className={styles.choiceIcon} aria-hidden>
              <IconRulerMeasure size={34} strokeWidth={1.55} />
            </div>
            <div className={styles.choiceCopy}>
              <p>Готовите реальный заказ?</p>
              <h2>Глубокий замер</h2>
              <p className={styles.description}>
                Укажите размеры отопителя и трассы. Получите точную смету по вашим данным
                после проверки менеджером.
              </p>
              <ul>
                <li>Схема по вашим размерам</li>
                <li>Полный состав комплекта</li>
                <li>Данные сохраняются по ходу заполнения</li>
              </ul>
            </div>
            <Link className={styles.primaryAction} href="/zamery?edit=1">
              Начать глубокий замер
              <IconArrowRight aria-hidden size={19} strokeWidth={1.8} />
            </Link>
          </article>

          <article className={styles.quickChoice}>
            <div className={styles.quickTopline}>
              <div className={styles.quickIcon} aria-hidden>
                <IconBolt size={28} strokeWidth={1.7} />
              </div>
              <span>Около 2 минут</span>
            </div>
            <div className={styles.choiceCopy}>
              <p>Не знаете размеры?</p>
              <h2>Быстрый расчёт</h2>
              <p className={styles.description}>
                Ответьте на несколько простых вопросов и узнайте ориентировочную стоимость
                без замеров. Возможное отклонение — ±30%.
              </p>
            </div>
            <Link className={styles.secondaryAction} href="/bystryy-raschet">
              Прикинуть бюджет
              <IconArrowRight aria-hidden size={19} strokeWidth={1.8} />
            </Link>
          </article>
        </section>

        <p className={styles.footerNote}>
          После быстрого расчёта можно перейти в глубокий замер — известные данные перенесём автоматически.
        </p>
      </div>
    </main>
  );
}
