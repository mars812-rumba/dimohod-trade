import type { Metadata } from "next";
import { workingHoursText } from "@/lib/contactLinks";
import Link from "next/link";
import { InstallationTermsSection } from "@/components/InstallationTermsSection";
import { HomeWorksShowcase } from "@/components/HomeWorksShowcase";
import { LeadForm } from "@/components/LeadForm";
import { installationTerms } from "@/lib/installationTerms";
import styles from "../contacts/page.module.css";

const title = "Монтаж дымоходов в СПб и Ленобласти — Дымоход Трейд";
const description = "Подбор комплекта и монтаж дымохода в Санкт-Петербурге и области. Условия платного замера, состав работ и реальные объекты. Окончательная стоимость после замера.";

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "/montazh" },
  openGraph: { title, description, url: "/montazh", type: "website", locale: "ru_RU" },
  twitter: { card: "summary", title, description },
};

export default function InstallationPage() {
  return (
    <main className={styles.main}>
      <div className={styles.shell}>
        <nav className={styles.breadcrumbs} aria-label="Хлебные крошки"><Link href="/">Главная</Link><span aria-hidden>/</span><span aria-current="page">Монтаж дымоходов</span></nav>
        <header className={styles.heading}>
          <h1>Монтаж дымоходов в Санкт-Петербурге и области</h1>
          <p>Поможем подобрать комплект под отопитель и маршрут, согласуем работы и окончательную смету после замера. {installationTerms.geography}</p>
          <div className={styles.actions}>
            <a className={styles.primary} href="#installation-request">Обсудить монтаж</a>
            <Link className={styles.secondary} href="/bystryy-raschet">Рассчитать изделия</Link>
          </div>
        </header>
        <section className={styles.section} aria-labelledby="cost-title">
          <h2 id="cost-title">Изделия и работы — отдельные части сметы</h2>
          <p>Онлайн-расчёт показывает предварительную стоимость изделий, а не цену монтажа. Стоимость работ согласуем по вашему объекту. Замер оплачивается отдельно; условия доставки и демонтажа, если он нужен, также уточняем перед заказом.</p>
          <p>Изготовление, выезд и монтаж — разные этапы. Дату выполнения работ согласуем отдельно, не подменяя её сроком изготовления комплекта.</p>
          <p>Для первого обсуждения подготовьте модель отопителя, населённый пункт, размеры и фотографии предполагаемого маршрута. Предварительная схема не заменяет проект и проверку специалистом.</p>
        </section>
      </div>
      <InstallationTermsSection />
      <div className={styles.shell}>
        <section className={styles.section} aria-labelledby="works-title">
          <h2 id="works-title">Реальные объекты</h2>
          <p>Посмотрите фотографии и описание работ. Состав и стоимость отдельного объекта не являются универсальной ценой для любого дома.</p>
          <HomeWorksShowcase objectIds={[11, 10, 1]} />
        </section>
        <section className={styles.section} id="installation-request" aria-labelledby="request-title">
          <h2 id="request-title">Обсудить монтаж на вашем объекте</h2>
          <p>{workingHoursText}</p>
          <p>Укажите, где находится объект, какой отопитель установлен и что нужно сделать. Фотографии можно приложить по желанию.</p>
          <LeadForm source="installation-page" submitLabel="Обсудить монтаж" commentPlaceholder="Населённый пункт, отопитель, маршрут и необходимые работы" />
          <div className={styles.actions}><Link className={styles.textLink} href="/contacts">Телефоны и адрес производства</Link><Link className={styles.textLink} href="/solutions/banya">Комплект для бани</Link><Link className={styles.textLink} href="/solutions/dom">Комплект для дома</Link><Link className={styles.textLink} href="/solutions/pech">Комплект для печи</Link></div>
        </section>
      </div>
    </main>
  );
}
