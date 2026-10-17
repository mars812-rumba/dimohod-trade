import type { Metadata } from "next";
import { workingHoursText } from "@/lib/contactLinks";
import Link from "next/link";
import styles from "./page.module.css";

const title = "Контакты Дымоход Трейд — производство и офис в СПб";
const description = "Телефоны, email и адрес Дымоход Трейд: Санкт-Петербург, ул. 2-й Луч, 4, корп. 2. Согласуйте посещение офиса или обсудите подбор комплекта дымохода.";

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "/contacts" },
  openGraph: { title, description, url: "/contacts", type: "website", locale: "ru_RU" },
  twitter: { card: "summary", title, description },
};

export default function ContactsPage() {
  return (
    <main className={styles.main}>
      <div className={styles.shell}>
        <nav className={styles.breadcrumbs} aria-label="Хлебные крошки"><Link href="/">Главная</Link><span aria-hidden>/</span><span aria-current="page">Контакты</span></nav>
        <header className={styles.heading}>
          <h1>Контакты Дымоход Трейд</h1>
          <p>Обсудите комплект по телефону или приезжайте в офис при производстве. Возьмите размеры, фотографии и паспорт отопителя, если они есть.</p>
        </header>
        <div className={styles.columns}>
          <section className={styles.section} aria-labelledby="contact-title">
            <h2 id="contact-title">Связаться с нами</h2>
            <dl className={styles.details}>
              <div><dt>Телефон сайта</dt><dd><a href="tel:+79643424565">+7 (964) 342-45-65</a></dd></div>
              <div><dt>Дополнительный телефон</dt><dd><a href="tel:+78126424545">+7 (812) 642-45-45</a></dd></div>
              <div><dt>Электронная почта</dt><dd><a href="mailto:office@dimohod-trade.pro">office@dimohod-trade.pro</a></dd></div>
            </dl>
            <p>Для подбора сообщите модель отопителя, населённый пункт и предполагаемый маршрут дымохода. Неизвестные параметры уточним вместе.</p>
          </section>
          <section className={styles.section} aria-labelledby="visit-title">
            <h2 id="visit-title">Офис и производство</h2>
            <address>Санкт-Петербург, ул. 2-й Луч, 4, корп. 2</address>
            <p>{workingHoursText}</p>
            <p>Время посещения согласуйте заранее по телефону.</p>
            <a className={styles.textLink} href="https://yandex.ru/maps/?text=Санкт-Петербург%2C%20ул.%202-й%20Луч%2C%204%2C%20корп.%202" target="_blank" rel="noopener noreferrer">Построить маршрут на Яндекс Картах</a>
          </section>
        </div>
        <section className={styles.section} aria-labelledby="next-title">
          <h2 id="next-title">Можно начать онлайн</h2>
          <p>Расчёт покажет предварительный состав и стоимость изделий. Перед заказом специалист проверит исходные данные и комплектацию.</p>
          <div className={styles.actions}>
            <Link className={styles.primary} href="/bystryy-raschet">Рассчитать комплект</Link>
            <Link className={styles.secondary} href="/catalog">Перейти в каталог</Link>
            <Link className={styles.textLink} href="/montazh">Условия монтажа и замера</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
