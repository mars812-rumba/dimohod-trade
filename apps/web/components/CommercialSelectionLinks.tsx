import Link from "next/link";
import styles from "./CommercialSelectionLinks.module.css";

export function CommercialSelectionLinks({ scenario }: { scenario: "pech" | "banya" }) {
  const isBath = scenario === "banya";
  return (
    <section className={styles.section} aria-labelledby={`${scenario}-purchase-title`}>
      <div className={styles.shell}>
        <h2 id={`${scenario}-purchase-title`}>Как заказать комплект {isBath ? "для банной печи" : "для печи"}</h2>
        <p>Начните с паспорта печи и замеров трассы. Онлайн-расчёт покажет предварительный состав и доступные цены; менеджер проверит данные перед оформлением заказа.</p>
        <ol>
          <li><strong>Подготовьте подключение.</strong> Нужны точная модель печи, параметры патрубка и предполагаемый маршрут.</li>
          <li><strong>Рассчитайте состав.</strong> Длина трассы, проходы, повороты и крепления определяют перечень деталей и стоимость.</li>
          <li><strong>Передайте расчёт на проверку.</strong> Уточните неизвестные размеры, состав заказа, способ и стоимость доставки.</li>
        </ol>
        <p>Если параметры уже известны, выбирайте отдельные изделия в каталоге. Наличие нужного диаметра само по себе не подтверждает совместимость с конкретной печью.</p>
        <nav className={styles.links} aria-label="Каталог и подготовка комплекта">
          <Link href="/catalog/sendvich-truby">Сэндвич-трубы и цены</Link>
          <Link href="/catalog">Все комплектующие</Link>
          <Link href="/guides/komplekt-dymohoda-dlya-pechi">Как проверить состав комплекта</Link>
          <Link href="/guides/komplekt-s-troynikom-90">Состав для маршрута через стену</Link>
          {isBath ? <Link href="/guides/dymohod-dlya-bani">Какие данные подготовить по бане</Link> : null}
        </nav>
        <Link className={styles.action} href={isBath ? "/zamery?edit=1&object=banya" : "/zamery?edit=1&object=house"}>Рассчитать комплект по замерам</Link>
      </div>
    </section>
  );
}
