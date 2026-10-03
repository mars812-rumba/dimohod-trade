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
import { pechScenario } from "@/lib/scenarioPages";
import { HomeQuickEstimate } from "./HomeQuickEstimate";
import { HomeWorksShowcase } from "./HomeWorksShowcase";
import { LeadForm } from "./LeadForm";
import { SolutionTrustSections } from "./SolutionTrustSections";
import { CommercialSelectionLinks } from "./CommercialSelectionLinks";
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
    title: "Модель печи и патрубок",
    text: "Название печи, положение выхода и диаметр из паспорта или по замеру.",
  },
  {
    icon: Route,
    title: "Маршрут дымохода",
    text: "Через перекрытия и кровлю либо через стену с наружным подъёмом.",
  },
  {
    icon: Checklist,
    title: "Размеры дома",
    text: "Этажность, чердак, высоты и примерные расстояния по выбранной трассе.",
  },
  {
    icon: Photo,
    title: "Фото места установки",
    text: "Общий вид печи, стен и будущих проходов помогает проверить исходные данные.",
  },
];

function absoluteUrl(path: string) {
  return new URL(`${appBasePath}${path}`, appUrl).toString();
}

export function PechScenarioLanding({ assetBasePath = "" }: { assetBasePath?: string }) {
  const canonicalUrl = absoluteUrl("/solutions/pech");
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: pechScenario.metadata.title,
        description: pechScenario.metadata.description,
        inLanguage: "ru-RU",
        isPartOf: { "@id": `${new URL(appUrl).origin}/#website` },
        breadcrumb: { "@id": `${canonicalUrl}#breadcrumb` },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: absoluteUrl(pechScenario.heroImage),
          caption: pechScenario.heroImageAlt,
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Главная", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Решения", item: absoluteUrl("/solutions") },
          { "@type": "ListItem", position: 3, name: "Дымоход для отопительной печи", item: canonicalUrl },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${canonicalUrl}#faq`,
        mainEntity: pechScenario.faq.map((item) => ({
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
            <span aria-current="page">Для отопительной печи</span>
          </nav>
        </div>

        <section className={styles.hero}>
          <div className={`${styles.shell} ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Дымоход для отопительной печи</p>
              <h1>Дымоход для печи: подбор и расчёт комплекта</h1>
              <p className={styles.heroText}>
                Укажите модель печи, расположение патрубка и маршрут. Покажем предварительный состав, реальные товары и ориентировочную стоимость.
              </p>
              <div className={styles.heroActions}>
                <a className={styles.primaryButton} href="#quick-estimate">
                  Рассчитать комплект <ArrowRight aria-hidden size={18} />
                </a>
                <a className={styles.secondaryButton} href="#help-with-selection">Оставить заявку</a>
              </div>
            </div>
            <div className={styles.heroMedia}>
              <Image
                alt={pechScenario.heroImageAlt}
                fill
                fetchPriority="high"
                priority
                quality={84}
                sizes="(max-width: 820px) 100vw, 52vw"
                src={`${assetBasePath}${pechScenario.heroImage}`}
              />
            </div>
          </div>
        </section>

        <section className={styles.resultStrip} aria-label="Результат быстрого расчёта">
          <div className={styles.shell}>
            <div><strong>Стоимость, состав и схема</strong><span>без отправки контактов</span></div>
            <div><strong>Товарный состав</strong><span>с количеством и ценами</span></div>
            <div><strong>Проверка менеджером</strong><span>перед оформлением заказа</span></div>
          </div>
        </section>

        <HomeQuickEstimate
          assetBasePath={assetBasePath}
          fixedEquipmentType="pech"
          fixedObjectType="house"
          introDescription="Дом и отопительная печь уже выбраны. Укажите состояние печи, патрубок, маршрут и известные размеры, а допущения увидите вместе с результатом."
          introEyebrow="Быстрый расчёт для печи"
          introTitle="Начните с патрубка и маршрута"
          leadSource="solution-pech-quick-estimate"
        />

        <section className={styles.helpSection} id="help-with-selection" aria-labelledby="pech-help-title">
          <div className={`${styles.shell} ${styles.helpGrid}`}>
            <div className={styles.helpVisual}>
              <Image
                alt="Отопительная печь с вертикальным дымоходом в жилом помещении"
                fill
                sizes="(max-width: 820px) 100vw, 43vw"
                src={`${assetBasePath}/images/home/scenario-pech-form-stove.webp`}
              />
            </div>
            <div className={styles.helpPanel}>
              <div className={styles.sectionHeading}>
                <h2 id="pech-help-title">Не знаете параметры? Поможем разобраться</h2>
                <p>Оставьте контакты — менеджер перезвонит и уточнит данные для подбора комплекта. Если есть фото печи, паспорта или места установки, прикрепите его для более предметного разговора.</p>
              </div>
              <LeadForm
                attachmentLabel="Добавить фото или паспорт"
                commentPlaceholder="Что уже известно: модель печи, диаметр, маршрут или размеры дома"
                source="solution-pech-help"
                submitLabel="Оставить заявку"
                successMessage="Менеджер перезвонит и уточнит данные для подбора комплекта."
              />
            </div>
          </div>
        </section>

        <section className={styles.inputsSection} aria-labelledby="pech-inputs-title">
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <h2 id="pech-inputs-title">Что нужно для расчёта дымохода для печи</h2>
              <p>Не обязательно знать всё сразу. Сначала фиксируем модель печи и маршрут, затем уточняем размеры и условия объекта.</p>
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

        <section className={styles.worksSection} aria-labelledby="pech-works-title">
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <h2 id="pech-works-title">Выполненная работа: печь и дымоход в доме</h2>
              <p>Остров Большой Берёзовый: печь Everest T6, комплект дымохода и монтаж с доставкой и расходными материалами.</p>
            </div>
            <HomeWorksShowcase objectIds={[5]} />
          </div>
        </section>

        <section className={styles.seoSection} aria-labelledby="pech-selection-title">
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>Подбор комплекта</p>
              <h2 id="pech-selection-title">Как подбирают дымоход для отопительной печи</h2>
              <p>Состав дымохода проверяют по конкретной модели печи, параметрам патрубка, маршруту и размерам дома.</p>
            </div>
            <div className={styles.seoGrid}>
              <article>
                <h3>Начинаем с паспорта печи</h3>
                <p>Название отопителя и параметры выходного патрубка помогают не переносить характеристики одной модели на другую. Если печь пока не выбрана, расчёт остаётся предварительным.</p>
              </article>
              <article>
                <h3>Через кровлю или через стену</h3>
                <p>Маршрут через помещения и кровлю отличается от наружного подъёма по фасаду. Для каждого варианта калькулятор формирует свой предварительный состав.</p>
                <div className={styles.inlineLinks}>
                  <Link href="/guides/dymohod-cherez-krovlyu">Маршрут через кровлю <ArrowRight aria-hidden size={15} /></Link>
                  <Link href="/guides/dymohod-cherez-stenu">Маршрут через стену <ArrowRight aria-hidden size={15} /></Link>
                </div>
              </article>
              <article>
                <h3>Из чего складывается стоимость</h3>
                <p>На состав влияют длина трассы, повороты, проходные элементы, опоры и крепления. Быстрый расчёт показывает ориентир, а итоговую смету подтверждаем после проверки данных.</p>
              </article>
              <article>
                <h3>Проверка состава перед заказом</h3>
                <p>Калькулятор формирует предварительный состав по введённым параметрам. Перед оформлением специалист сверяет печь, размеры объекта, найденные товары и позиции, которые требуют уточнения.</p>
              </article>
            </div>
            <div className={styles.measurementCallout}>
              <div>
                <strong>Нужен более точный расчёт?</strong>
                <p>Сохраните подробные замеры дома и вернитесь к ним после уточнения неизвестных параметров.</p>
              </div>
              <Link className={styles.secondaryButton} href="/zamery?edit=1&object=house">
                Перейти к замерам <ArrowRight aria-hidden size={17} />
              </Link>
            </div>
          </div>
        </section>

        <SolutionTrustSections assetBasePath={assetBasePath} />
        <CommercialSelectionLinks scenario="pech" />

        <section className={styles.reviewsSection} aria-labelledby="pech-reviews-title">
          <div className={`${styles.shell} ${styles.reviewsLayout}`}>
            <div className={styles.reviewsIntro}>
              <Image alt="" aria-hidden height={52} src={`${assetBasePath}/images/home/yandex-maps-icon-user-v6.png`} width={52} />
              <h2 id="pech-reviews-title">Отзывы клиентов на Яндекс Картах</h2>
              <p className={styles.reviewsNote}>Краткое содержание отзывов. Оригиналы смотрите на Яндекс Картах.</p>
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

        <section className={styles.explainerSection} aria-labelledby="pech-explainer-title">
          <div className={`${styles.shell} ${styles.explainerGrid}`}>
            <div>
              <h2 id="pech-explainer-title">Что проверяем перед заказом</h2>
              <p>Предварительный расчёт помогает увидеть состав и бюджет. Финальный вариант подтверждается после сверки печи и объекта.</p>
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
                <p>Сверяем найденные товары, количество, соединительные параметры и позиции без точного совпадения.</p>
              </article>
            </div>
          </div>
        </section>

        <section className={styles.faqSection} aria-labelledby="pech-faq-title">
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <h2 id="pech-faq-title">Частые вопросы о дымоходе для печи</h2>
            </div>
            <div className={styles.faqList}>
              {pechScenario.faq.map((item) => (
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
              <h2>Получите состав и стоимость дымохода для печи</h2>
              <p>Пройдите быстрый расчёт или отправьте фотографии и данные печи менеджеру.</p>
            </div>
            <div className={styles.finalActions}>
              <a className={styles.primaryButton} href="#quick-estimate">Рассчитать комплект</a>
              <a className={styles.secondaryButton} href="#help-with-selection">Оставить заявку</a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
