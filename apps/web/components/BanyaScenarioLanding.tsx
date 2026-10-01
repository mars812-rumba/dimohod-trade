import Image from "next/image";
import Link from "next/link";
import {
  IconArrowRight as ArrowRight,
  IconChecklist as Checklist,
  IconExternalLink as ExternalLink,
  IconFileDescription as FileDescription,
  IconFlame as Flame,
  IconPhoto as Photo,
  IconRoute as Route,
  IconShieldCheck as ShieldCheck,
  IconStarFilled as Star,
} from "@tabler/icons-react";
import { banyaScenario } from "@/lib/scenarioPages";
import { HomeQuickEstimate } from "./HomeQuickEstimate";
import { HomeWorksShowcase } from "./HomeWorksShowcase";
import { LeadForm } from "./LeadForm";
import { SolutionTrustSections } from "./SolutionTrustSections";
import { YANDEX_MAPS_RATING } from "./YandexRatingBadge";
import styles from "./HomeScenarioLanding.module.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dimohod-trade.pro";
const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const reviews = [
  { author: "Алексей Чуб", text: "Отметил скорость работы, качество материалов и профессиональную работу замерщика." },
  { author: "Артем Богданов", text: "Заказывает здесь с 2018 года. Отметил нестандартное изготовление, выбор исполнения и цены." },
  { author: "Глеб Борисыч", text: "Давно сотрудничает с компанией. Положительно оценил качество, сроки и ответственность." },
];

const inputGroups = [
  {
    icon: Flame,
    title: "Банная печь и патрубок",
    text: "Модель печи, положение выхода и диаметр из паспорта или по замеру.",
  },
  {
    icon: Route,
    title: "Маршрут дымохода",
    text: "Через перекрытие и кровлю либо через стену с наружным подъёмом.",
  },
  {
    icon: Checklist,
    title: "Размеры бани",
    text: "Высоты, уровни, чердак и примерные расстояния по выбранному маршруту.",
  },
  {
    icon: Photo,
    title: "Фото места установки",
    text: "Общий вид печи и будущих проходов помогает проверить исходные данные.",
  },
];

function absoluteUrl(path: string) {
  return new URL(`${appBasePath}${path}`, appUrl).toString();
}

export function BanyaScenarioLanding({ assetBasePath = "" }: { assetBasePath?: string }) {
  const canonicalUrl = absoluteUrl("/solutions/banya");
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: banyaScenario.metadata.title,
        description: banyaScenario.metadata.description,
        inLanguage: "ru-RU",
        isPartOf: { "@id": `${new URL(appUrl).origin}/#website` },
        breadcrumb: { "@id": `${canonicalUrl}#breadcrumb` },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: absoluteUrl(banyaScenario.heroImage),
          caption: banyaScenario.heroImageAlt,
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Главная", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Решения", item: absoluteUrl("/solutions") },
          { "@type": "ListItem", position: 3, name: "Дымоход для бани", item: canonicalUrl },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${canonicalUrl}#faq`,
        mainEntity: banyaScenario.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
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
            <span aria-current="page">Для бани</span>
          </nav>
        </div>

        <section className={styles.hero}>
          <div className={`${styles.shell} ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Дымоход для банной печи</p>
              <h1>Рассчитайте дымоход для бани</h1>
              <p className={styles.heroText}>
                Получите предварительный состав комплекта, реальные товары и ориентировочную стоимость до отправки контакта.
              </p>
              <div className={styles.heroActions}>
                <a className={styles.primaryButton} href="#quick-estimate">
                  Рассчитать дымоход <ArrowRight aria-hidden size={18} />
                </a>
                <a className={styles.secondaryButton} href="#help-with-selection">Оставить заявку</a>
              </div>
            </div>
            <div className={styles.heroMedia}>
              <Image
                alt={banyaScenario.heroImageAlt}
                fill
                fetchPriority="high"
                priority
                quality={84}
                sizes="(max-width: 820px) 100vw, 52vw"
                src={`${assetBasePath}${banyaScenario.heroImage}`}
              />
            </div>
          </div>
        </section>

        <section className={styles.resultStrip} aria-label="Результат быстрого расчёта">
          <div className={styles.shell}>
            <div><strong>Стоимость и состав</strong><span>после отправки контактов</span></div>
            <div><strong>Товарный состав</strong><span>с количеством и ценами</span></div>
            <div><strong>Проверка менеджером</strong><span>перед оформлением заказа</span></div>
          </div>
        </section>

        <HomeQuickEstimate
          assetBasePath={assetBasePath}
          fixedObjectType="banya"
          introDescription="Баня и банная печь уже выбраны. Укажите патрубок, маршрут и известные размеры, а допущения увидите вместе с результатом."
          introEyebrow="Быстрый расчёт для бани"
          introTitle="Начните с данных о печи и маршруте"
          leadSource="solution-banya-quick-estimate"
        />

        <section className={styles.helpSection} id="help-with-selection" aria-labelledby="banya-help-title">
          <div className={`${styles.shell} ${styles.helpGrid}`}>
            <div className={styles.helpVisual}>
              <Image
                alt="Установленная банная печь, бак и дымоход у защитной стены"
                fill
                sizes="(max-width: 820px) 100vw, 43vw"
                src={`${assetBasePath}/images/works/object-7/04.webp`}
              />
            </div>
            <div className={styles.helpPanel}>
              <div className={styles.sectionHeading}>
                <h2 id="banya-help-title">Не знаете параметры? Пришлите фото</h2>
                <p>Добавьте название печи, фото места установки или план бани. Менеджер подскажет, какие данные нужны для проверки.</p>
              </div>
              <LeadForm
                attachmentLabel="Добавить фото или план"
                commentPlaceholder="Что уже известно: модель печи, диаметр, маршрут или размеры бани"
                source="solution-banya-help"
                submitLabel="Оставить заявку"
                successMessage="Менеджер посмотрит материалы и сообщит, что нужно уточнить для подбора."
              />
            </div>
          </div>
        </section>

        <section className={styles.inputsSection} aria-labelledby="banya-inputs-title">
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <h2 id="banya-inputs-title">Что нужно для расчёта дымохода в бане</h2>
              <p>Не обязательно знать всё сразу. Сначала фиксируем печь и маршрут, затем уточняем размеры и условия объекта.</p>
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

        <section className={styles.worksSection} aria-labelledby="banya-works-title">
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <h2 id="banya-works-title">Выполненная работа: дымоход для бани</h2>
              <p>Объект в Дивенской: комплект дымохода, монтаж и устройство противопожарной стены.</p>
            </div>
            <HomeWorksShowcase objectIds={[7]} />
          </div>
        </section>

        <section className={styles.seoSection} aria-labelledby="banya-selection-title">
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>Подбор комплекта</p>
              <h2 id="banya-selection-title">Как выбирают дымоход для банной печи</h2>
              <p>Готовый комплект зависит не только от диаметра трубы. Нужны данные печи, понятный маршрут и размеры всех участков.</p>
            </div>
            <div className={styles.seoGrid}>
              <article>
                <h3>Начинаем с модели печи</h3>
                <p>Если печь уже выбрана, используем паспорт и параметры выходного патрубка. Если модели пока нет, можно сравнить маршруты, но соединительные размеры и финальный состав останутся на проверке.</p>
              </article>
              <article>
                <h3>Через кровлю или через стену</h3>
                <p>Маршрут через перекрытие и кровлю отличается от наружного подъёма по фасаду. Для каждого варианта калькулятор задаёт свои вопросы и формирует отдельный предварительный состав.</p>
                <div className={styles.inlineLinks}>
                  <Link href="/guides/dymohod-cherez-krovlyu">Маршрут через кровлю <ArrowRight aria-hidden size={15} /></Link>
                  <Link href="/guides/dymohod-cherez-stenu">Маршрут через стену <ArrowRight aria-hidden size={15} /></Link>
                </div>
              </article>
              <article>
                <h3>Из чего складывается стоимость</h3>
                <p>Цена комплекта меняется вместе с длиной трассы, количеством проходов, поворотов, опор и креплений. Быстрый расчёт показывает ориентир, а итоговую смету подтверждаем после проверки исходных данных.</p>
              </article>
              <article>
                <h3>Расчёт и монтаж дымохода</h3>
                <p>Вместе с заявкой можно передать предварительный состав и фотографии объекта. Специалист сверит оборудование, размеры, условия монтажа и позиции каталога перед оформлением заказа.</p>
              </article>
            </div>
            <div className={styles.measurementCallout}>
              <div>
                <strong>Нужен более точный расчёт?</strong>
                <p>Сохраните подробные замеры бани и вернитесь к ним после уточнения неизвестных параметров.</p>
              </div>
              <Link className={styles.secondaryButton} href="/zamery?edit=1&object=banya">
                Перейти к замерам <ArrowRight aria-hidden size={17} />
              </Link>
            </div>
          </div>
        </section>

        <SolutionTrustSections assetBasePath={assetBasePath} />

        <section className={styles.reviewsSection} aria-labelledby="banya-reviews-title">
          <div className={`${styles.shell} ${styles.reviewsLayout}`}>
            <div className={styles.reviewsIntro}>
              <Image alt="" aria-hidden height={52} src={`${assetBasePath}/images/home/yandex-maps-icon-user-v6.png`} width={52} />
              <h2 id="banya-reviews-title">Отзывы клиентов на Яндекс Картах</h2>
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

        <section className={styles.explainerSection} aria-labelledby="banya-explainer-title">
          <div className={`${styles.shell} ${styles.explainerGrid}`}>
            <div>
              <h2 id="banya-explainer-title">Что проверяем перед заказом</h2>
              <p>Предварительный расчёт помогает увидеть состав и бюджет. Финальный вариант подтверждается после сверки объекта.</p>
            </div>
            <div className={styles.explainerColumns}>
              <article>
                <Route aria-hidden size={25} />
                <h3>Маршрут</h3>
                <p>Проверяем положение печи, направление патрубка и все участки будущей трассы.</p>
              </article>
              <article>
                <ShieldCheck aria-hidden size={25} />
                <h3>Условия объекта</h3>
                <p>Уточняем конструкции на пути дымохода, места проходов, крепление и доступ для работ.</p>
              </article>
              <article>
                <FileDescription aria-hidden size={25} />
                <h3>Состав комплекта</h3>
                <p>Сверяем найденные товары, количество, соединительные параметры и позиции без цены.</p>
              </article>
            </div>
          </div>
        </section>

        <section className={styles.faqSection} aria-labelledby="banya-faq-title">
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <h2 id="banya-faq-title">Частые вопросы о дымоходе для бани</h2>
            </div>
            <div className={styles.faqList}>
              {banyaScenario.faq.map((item) => (
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
              <h2>Получите состав и стоимость дымохода для бани</h2>
              <p>Пройдите быстрый расчёт или отправьте фотографии менеджеру.</p>
            </div>
            <div className={styles.finalActions}>
              <a className={styles.primaryButton} href="#quick-estimate">Рассчитать дымоход</a>
              <a className={styles.secondaryButton} href="#help-with-selection">Оставить заявку</a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
