import type { Metadata } from "next";
import Link from "next/link";
import {
  IconArrowRight as ArrowRight,
  IconCamera as Camera,
  IconFileDescription as FileDescription,
  IconMail as Mail,
  IconPhone as Phone,
  IconUser as User,
} from "@tabler/icons-react";
import styles from "./page.module.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dimohod-trade.pro";
const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const pagePath = "/warranty";
const email = "office@dimohod-trade.pro";
const title = "Гарантия на дымоходы и сервис | Дымоход Трейд";
const description =
  "Узнайте, что подготовить для гарантийного обращения и как связаться с Дымоход Трейд по вопросу конкретного заказа.";

function absoluteUrl(path: string) {
  return new URL(`${appBasePath}${path}`, appUrl).toString();
}

const warrantySubject = encodeURIComponent("Гарантийное обращение — заказ №");
const warrantyBody = encodeURIComponent([
  "Имя:",
  "Телефон:",
  "Номер и дата заказа:",
  "Описание проблемы:",
  "",
  "Пожалуйста, приложите фотографии изделия и места установки.",
].join("\n"));
const warrantyMailto = `mailto:${email}?subject=${warrantySubject}&body=${warrantyBody}`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: pagePath },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: absoluteUrl(pagePath),
    title,
    description,
    images: [{
      url: absoluteUrl("/images/about/about-social.webp"),
      width: 1200,
      height: 630,
      alt: "Производство дымоходов Дымоход Трейд",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [absoluteUrl("/images/about/about-social.webp")],
  },
};

export default function WarrantyPage() {
  const canonicalUrl = absoluteUrl(pagePath);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: title,
        description,
        inLanguage: "ru-RU",
        breadcrumb: { "@id": `${canonicalUrl}#breadcrumb` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Главная", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Гарантия", item: canonicalUrl },
        ],
      },
    ],
  };

  return (
    <main className={styles.main}>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        type="application/ld+json"
      />

      <section className={styles.hero}>
        <div className={`${styles.shell} ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <nav aria-label="Хлебные крошки" className={styles.breadcrumbs}>
              <Link href="/">Главная</Link>
              <span aria-hidden>/</span>
              <span aria-current="page">Гарантия</span>
            </nav>
            <h1>Гарантия и сервис</h1>
            <p>
              Срок и условия гарантии указаны в документах на конкретный заказ. Если возник
              вопрос по изделию, напишите нам — найдём заказ и разберём обращение.
            </p>
          </div>

          <aside className={styles.contactPanel} aria-label="Обращение по гарантии">
            <Mail aria-hidden size={30} strokeWidth={1.6} />
            <h2>Напишите нам на почту</h2>
            <p>Укажите номер заказа, опишите ситуацию и приложите фотографии.</p>
            <a className={styles.primaryAction} href={warrantyMailto}>
              Написать по гарантии <ArrowRight aria-hidden size={18} />
            </a>
            <a className={styles.emailLink} href={`mailto:${email}`}>{email}</a>
          </aside>
        </div>
      </section>

      <div className={styles.shell}>
        <section className={styles.principles} aria-labelledby="warranty-principles-title">
          <header className={styles.sectionIntro}>
            <h2 id="warranty-principles-title">Как работает гарантия</h2>
            <p>Без сложной формы: получаем материалы, находим заказ и разбираем обращение по существу.</p>
          </header>
          <div className={styles.principleGrid}>
            <article>
              <h3>Условия указаны в заказе</h3>
              <p>Срок и условия гарантии смотрите в документах, полученных при оформлении заказа.</p>
            </article>
            <article>
              <h3>Каждое обращение проверяется</h3>
              <p>Специалист сверит обращение с документами на заказ и изучит приложенные материалы.</p>
            </article>
            <article>
              <h3>Ответ после рассмотрения</h3>
              <p>После проверки мы свяжемся с вами и сообщим дальнейший порядок действий.</p>
            </article>
          </div>
        </section>

        <section className={styles.requestGuide} aria-labelledby="warranty-request-title">
          <div className={styles.requestIntro}>
            <h2 id="warranty-request-title">Что указать в письме</h2>
            <p>
              Чем больше исходных данных будет в первом письме, тем быстрее специалист сможет
              найти заказ и понять ситуацию.
            </p>
          </div>
          <ol className={styles.requestList}>
            <li><User aria-hidden size={21} /><span><strong>Имя и телефон</strong><small>Чтобы уточнить детали обращения.</small></span></li>
            <li><FileDescription aria-hidden size={21} /><span><strong>Номер и дата заказа</strong><small>Если они сохранились.</small></span></li>
            <li><Mail aria-hidden size={21} /><span><strong>Краткое описание</strong><small>Что произошло и когда это было замечено.</small></span></li>
            <li><Camera aria-hidden size={21} /><span><strong>Фотографии</strong><small>Изделие и место установки с нескольких ракурсов.</small></span></li>
          </ol>
        </section>

        <section className={styles.conditions} aria-labelledby="warranty-conditions-title">
          <div>
            <h2 id="warranty-conditions-title">Общие условия</h2>
            <p>
              Каждое обращение рассматривается по документам на конкретный заказ и предоставленным
              материалам. Если для проверки понадобятся дополнительные сведения или фотографии,
              специалист сообщит об этом в ответном письме.
            </p>
          </div>
          <p className={styles.conditionsNote}>
            После рассмотрения мы сообщим результат и дальнейший порядок действий.
          </p>
        </section>

        <section className={styles.finalContact} aria-labelledby="warranty-contact-title">
          <div>
            <h2 id="warranty-contact-title">Готовы отправить обращение?</h2>
            <p>Письмо откроется с готовой темой и подсказкой, какие сведения добавить.</p>
          </div>
          <div className={styles.finalActions}>
            <a className={styles.primaryAction} href={warrantyMailto}>
              <Mail aria-hidden size={18} /> Написать по гарантии
            </a>
            <a className={styles.phoneAction} href="tel:+79650756555">
              <Phone aria-hidden size={18} /> +7 (965) 075-65-55
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
