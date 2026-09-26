import Image from "next/image";
import Link from "next/link";
import {
  IconArrowRight as ArrowRight,
  IconChecklist as Checklist,
  IconExternalLink as ExternalLink,
  IconFileDescription as FileDescription,
  IconHome as Home,
  IconPhoto as Photo,
  IconRoute as Route,
  IconShieldCheck as ShieldCheck,
  IconStarFilled as Star,
} from "@tabler/icons-react";
import { homeScenario } from "@/lib/scenarioPages";
import { HomeQuickEstimate } from "./HomeQuickEstimate";
import { HomeWorksShowcase } from "./HomeWorksShowcase";
import { LeadForm } from "./LeadForm";
import { YANDEX_MAPS_RATING } from "./YandexRatingBadge";
import styles from "./HomeScenarioLanding.module.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dimohod-trade.pro";
const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const reviews = [
  {
    author: "Алексей Чуб",
    text: "Отметил скорость работы, качество материалов и профессиональную работу замерщика.",
  },
  {
    author: "Артем Богданов",
    text: "Заказывает здесь с 2018 года. Отметил нестандартное изготовление, выбор исполнения и цены.",
  },
  {
    author: "Глеб Борисыч",
    text: "Давно сотрудничает с компанией. Положительно оценил качество, сроки и ответственность.",
  },
];

const inputGroups = [
  {
    icon: Home,
    title: "Отопитель и патрубок",
    text: "Тип оборудования, положение выхода и диаметр, если он уже известен.",
  },
  {
    icon: Route,
    title: "Маршрут дымохода",
    text: "Через перекрытия и кровлю или через стену с подъёмом по фасаду.",
  },
  {
    icon: Checklist,
    title: "Размеры дома",
    text: "Этажность, наличие холодного чердака, примерная высота и расстояния.",
  },
  {
    icon: Photo,
    title: "Фото, если есть",
    text: "Снимок места установки поможет менеджеру проверить предварительный результат.",
  },
];

function absoluteUrl(path: string) {
  return new URL(`${appBasePath}${path}`, appUrl).toString();
}

export function HomeScenarioLanding({ assetBasePath = "" }: { assetBasePath?: string }) {
  const canonicalUrl = absoluteUrl("/solutions/dom");
  const faqJsonLd = {
    "@type": "FAQPage",
    "@id": `${canonicalUrl}#faq`,
    mainEntity: homeScenario.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: homeScenario.metadata.title,
        description: homeScenario.metadata.description,
        inLanguage: "ru-RU",
        isPartOf: { "@id": `${new URL(appUrl).origin}/#website` },
        breadcrumb: { "@id": `${canonicalUrl}#breadcrumb` },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: absoluteUrl(homeScenario.heroImage),
          caption: homeScenario.heroImageAlt,
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Главная", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Решения", item: absoluteUrl("/solutions") },
          { "@type": "ListItem", position: 3, name: "Дымоход для дома", item: canonicalUrl },
        ],
      },
      faqJsonLd,
    ],
  };

  return (
    <>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        type="application/ld+json"
      />
      <main className={styles.main}>
        <div className={styles.shell}>
          <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
            <Link href="/">Главная</Link><span aria-hidden>/</span>
            <Link href="/solutions">Решения</Link><span aria-hidden>/</span>
            <span aria-current="page">Для дома</span>
          </nav>
        </div>

        <section className={styles.hero}>
          <div className={`${styles.shell} ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Дымоход для частного дома</p>
              <h1>Рассчитайте дымоход для дома</h1>
              <p className={styles.heroText}>
                Получите предварительный состав, реальные товары, количество и ориентировочную стоимость.
              </p>
              <div className={styles.heroActions}>
                <a className={styles.primaryButton} href="#quick-estimate">
                  Рассчитать дымоход <ArrowRight aria-hidden size={18} />
                </a>
                <a className={styles.secondaryButton} href="#help-with-selection">Отправить материалы</a>
              </div>
            </div>
            <div className={styles.heroMedia}>
              <Image
                alt={homeScenario.heroImageAlt}
                fill
                fetchPriority="high"
                priority
                quality={84}
                sizes="(max-width: 820px) 100vw, 52vw"
                src={`${assetBasePath}${homeScenario.heroImage}`}
              />
            </div>
          </div>
        </section>

        <section className={styles.resultStrip} aria-label="Результат быстрого расчёта">
          <div className={styles.shell}>
            <div><strong>Ориентировочная стоимость</strong><span>до ввода контакта</span></div>
            <div><strong>Товарный состав</strong><span>с количеством и ценами</span></div>
            <div><strong>Проверка менеджером</strong><span>перед оформлением заказа</span></div>
          </div>
        </section>

        <HomeQuickEstimate
          assetBasePath={assetBasePath}
          fixedObjectType="house"
          introDescription="Начните с известных данных. Неизвестные параметры отметим как допущения и передадим менеджеру вместе с результатом."
          introEyebrow="Быстрый расчёт"
          introTitle="Начните с того, что уже знаете"
        />

        <section className={styles.helpSection} id="help-with-selection" aria-labelledby="help-title">
          <div className={`${styles.shell} ${styles.helpGrid}`}>
            <div className={styles.helpVisual}>
              <Image
                alt="Установленная печь с дымоходом в частном доме"
                fill
                sizes="(max-width: 820px) 100vw, 43vw"
                src={`${assetBasePath}/images/solutions/dom/house-chimney-room.webp`}
              />
            </div>
            <div className={styles.helpPanel}>
              <div className={styles.sectionHeading}>
                <h2 id="help-title">Не знаете параметры? Поможем подобрать</h2>
                <p>Пришлите фото, план или название оборудования. Скажем, каких данных не хватает для проверки.</p>
              </div>
              <LeadForm
                attachmentLabel="Добавить фото или план"
                commentPlaceholder="Что уже известно: модель, диаметр, этажность или предполагаемый маршрут"
                source="solution-dom-help"
                submitLabel="Отправить материалы"
                successMessage="Менеджер посмотрит материалы и сообщит, что нужно уточнить для подбора."
              />
            </div>
          </div>
        </section>

        <section className={styles.inputsSection} aria-labelledby="inputs-title">
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <h2 id="inputs-title">Что нужно определить до подбора</h2>
              <p>Не обязательно знать всё сразу. Калькулятор использует ответы, а неизвестные данные показывает отдельно.</p>
            </div>
            <div className={styles.inputGrid}>
              {inputGroups.map(({ icon: Icon, title, text }) => (
                <article key={title}>
                  <Icon aria-hidden size={24} strokeWidth={1.7} />
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.worksSection} aria-labelledby="works-title">
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <h2 id="works-title">Один объект, весь маршрут дымохода</h2>
              <p>На фотографиях видны подключение, проходы через конструкции и завершение над кровлей.</p>
            </div>
            <HomeWorksShowcase objectIds={[1]} />
          </div>
        </section>

        <section className={styles.reviewsSection} aria-labelledby="reviews-title">
          <div className={`${styles.shell} ${styles.reviewsLayout}`}>
            <div className={styles.reviewsIntro}>
              <Image
                alt=""
                aria-hidden
                height={52}
                src={`${assetBasePath}/images/home/yandex-maps-icon-user-v6.png`}
                width={52}
              />
              <h2 id="reviews-title">Отзывы клиентов на Яндекс Картах</h2>
              <div className={styles.rating} aria-label={`Рейтинг ${YANDEX_MAPS_RATING} из 5`}>
                <strong>{YANDEX_MAPS_RATING}</strong>
                <span>{Array.from({ length: 5 }, (_, index) => <Star aria-hidden key={index} size={18} />)}</span>
              </div>
              <a href="https://yandex.ru/maps/org/dymokhod_treyd/1368513691/reviews/" rel="noopener noreferrer" target="_blank">
                Все отзывы <ExternalLink aria-hidden size={16} />
              </a>
            </div>
            <div className={styles.reviewRail} aria-label="Краткие пересказы отзывов" role="region" tabIndex={0}>
              {reviews.map((review) => (
                <article key={review.author}>
                  <span aria-hidden>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={15} />)}</span>
                  <p>{review.text}</p>
                  <strong>{review.author}</strong>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.explainerSection} aria-labelledby="explainer-title">
          <div className={`${styles.shell} ${styles.explainerGrid}`}>
            <div>
              <h2 id="explainer-title">Что влияет на состав комплекта</h2>
              <p>Один и тот же дом может потребовать разный набор изделий. Состав зависит от оборудования, маршрута и введённых размеров.</p>
            </div>
            <div className={styles.explainerColumns}>
              <article>
                <Route aria-hidden size={25} />
                <h3>Маршрут</h3>
                <p>Выход через кровлю и наружный подъём по фасаду формируют разные предварительные BOM.</p>
              </article>
              <article>
                <ShieldCheck aria-hidden size={25} />
                <h3>Проверка</h3>
                <p>Итоговый состав подтверждает специалист после сверки оборудования, размеров и условий объекта.</p>
              </article>
              <article>
                <FileDescription aria-hidden size={25} />
                <h3>Неизвестные данные</h3>
                <p>Калькулятор показывает принятые допущения, чтобы их можно было проверить до заказа.</p>
              </article>
            </div>
          </div>
        </section>

        <section className={styles.faqSection} aria-labelledby="faq-title">
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <h2 id="faq-title">Частые вопросы о дымоходе для дома</h2>
            </div>
            <div className={styles.faqList}>
              {homeScenario.faq.map((item) => (
                <details key={item.question}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.finalSection}>
          <div className={`${styles.shell} ${styles.finalPanel}`}>
            <div>
              <h2>Получите предварительный состав и стоимость</h2>
              <p>Пройдите короткий расчёт или отправьте материалы менеджеру.</p>
            </div>
            <div className={styles.finalActions}>
              <a className={styles.primaryButton} href="#quick-estimate">Рассчитать дымоход</a>
              <a className={styles.secondaryButton} href="#help-with-selection">Отправить материалы</a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
