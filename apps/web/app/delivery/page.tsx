import type { Metadata } from "next";
import Link from "next/link";
import {
  IconArrowRight as ArrowRight,
  IconBuildingWarehouse as Warehouse,
  IconCashBanknote as Payment,
  IconMapPin as MapPin,
  IconPhone as Phone,
  IconTruckDelivery as TruckDelivery,
} from "@tabler/icons-react";
import styles from "./page.module.css";

const title = "Доставка дымоходов по России — Дымоход Трейд";
const description =
  "Отправляем трубы и комплектующие из Санкт-Петербурга по России транспортной компанией «Деловые Линии». Стоимость доставки рассчитывается индивидуально.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/delivery" },
  openGraph: {
    title,
    description,
    type: "website",
    url: "/delivery",
    locale: "ru_RU",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

export default function DeliveryPage() {
  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <div className={styles.shell}>
          <p className={styles.eyebrow}>Доставка по всей России</p>
          <h1>Отправляем трубы и комплектующие из Санкт-Петербурга</h1>
          <p className={styles.lead}>
            Передаём заказы транспортной компании «Деловые Линии». Стоимость доставки
            рассчитываем индивидуально после уточнения состава заказа и пункта назначения.
          </p>
          <div className={styles.actions}>
            <a className={styles.primaryAction} href="tel:+79650756555">
              <Phone aria-hidden size={19} /> Рассчитать доставку
            </a>
            <Link className={styles.secondaryAction} href="/catalog">
              Перейти в каталог <ArrowRight aria-hidden size={18} />
            </Link>
          </div>
        </div>
      </section>

      <div className={styles.shell}>
        <section className={styles.facts} aria-label="Основные условия доставки">
          <article className={styles.fact}>
            <span className={styles.factIcon}><MapPin aria-hidden size={23} /></span>
            <div><strong>Отправка</strong><span>из Санкт-Петербурга</span></div>
          </article>
          <article className={styles.fact}>
            <span className={styles.factIcon}><TruckDelivery aria-hidden size={23} /></span>
            <div><strong>Перевозчик</strong><span>«Деловые Линии»</span></div>
          </article>
          <article className={styles.fact}>
            <span className={styles.factIcon}><Payment aria-hidden size={23} /></span>
            <div><strong>Оплата заказа</strong><span>100% предоплата</span></div>
          </article>
        </section>

        <section className={styles.process} aria-labelledby="delivery-process-title">
          <div className={styles.sectionIntro}>
            <p className={styles.kicker}>Как оформить заказ</p>
            <h2 id="delivery-process-title">Сначала согласуем состав и доставку</h2>
            <p>
              Фиксированной стоимости доставки нет: расчёт зависит от конкретного заказа и
              пункта назначения.
            </p>
          </div>
          <ol className={styles.steps}>
            <li><span>01</span><p>Сообщите, какие трубы и комплектующие нужны, и укажите пункт назначения.</p></li>
            <li><span>02</span><p>Менеджер уточнит состав заказа и рассчитает доставку индивидуально.</p></li>
            <li><span>03</span><p>После согласования заказ оформляется по 100% предоплате.</p></li>
            <li><span>04</span><p>Готовый заказ отправляется из Санкт-Петербурга через «Деловые Линии».</p></li>
          </ol>
        </section>

        <section className={styles.cta}>
          <span className={styles.ctaIcon}><Warehouse aria-hidden size={30} /></span>
          <div>
            <h2>Нужен расчёт доставки?</h2>
            <p>Назовите состав заказа и пункт назначения — менеджер рассчитает стоимость.</p>
          </div>
          <a href="tel:+79650756555">+7 (965) 075-65-55</a>
        </section>
      </div>
    </main>
  );
}
