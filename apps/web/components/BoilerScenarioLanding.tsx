import Image from "next/image";
import Link from "next/link";
import {
  IconArrowRight as ArrowRight,
  IconBuilding as Building,
  IconExternalLink as ExternalLink,
  IconFileDescription as FileDescription,
  IconFlame as Flame,
  IconPhoto as Photo,
  IconRoute as Route,
  IconRulerMeasure as Ruler,
  IconShieldCheck as ShieldCheck,
  IconStarFilled as Star,
  type Icon,
} from "@tabler/icons-react";
import type { QuickEstimateEquipment } from "@/lib/homeQuickEstimate";
import {
  gasBoilerScenario,
  solidFuelBoilerScenario,
  type ScenarioIconName,
  type ScenarioPageContent,
} from "@/lib/scenarioPages";
import { HomeQuickEstimate } from "./HomeQuickEstimate";
import { HomeWorksShowcase } from "./HomeWorksShowcase";
import { LeadForm } from "./LeadForm";
import { SolutionTrustSections } from "./SolutionTrustSections";
import { YANDEX_MAPS_RATING } from "./YandexRatingBadge";
import styles from "./HomeScenarioLanding.module.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dimohod-trade.pro";
const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type BoilerKind = "solid-fuel" | "gas";

type BoilerLandingConfig = {
  breadcrumb: string;
  calculatorDescription: string;
  calculatorEyebrow: string;
  calculatorTitle: string;
  content: ScenarioPageContent;
  equipmentType: QuickEstimateEquipment;
  explainerDescription: string;
  explainerTitle: string;
  faqTitle: string;
  finalDescription: string;
  finalTitle: string;
  formCommentPlaceholder: string;
  formImage: string;
  formImageAlt: string;
  formTitle: string;
  heroText: string;
  h1: string;
  inputDescription: string;
  inputTitle: string;
  leadSource: string;
  seoCards: Array<{ title: string; text: string }>;
  seoDescription: string;
  seoTitle: string;
  work?: { description: string; objectId: number; title: string };
};

const configByKind: Record<BoilerKind, BoilerLandingConfig> = {
  "solid-fuel": {
    breadcrumb: "Для твердотопливного котла",
    calculatorDescription:
      "Дом и твердотопливный котёл уже выбраны. Укажите состояние оборудования, патрубок, маршрут и известные размеры.",
    calculatorEyebrow: "Быстрый расчёт для ТТ-котла",
    calculatorTitle: "Начните с подключения и маршрута",
    content: solidFuelBoilerScenario,
    equipmentType: "tt-kotel",
    explainerDescription:
      "Калькулятор показывает предварительный состав. Перед заказом специалист сверяет его с котлом, документацией и объектом.",
    explainerTitle: "Что проверяем перед заказом",
    faqTitle: "Частые вопросы о дымоходе для твердотопливного котла",
    finalDescription:
      "Пройдите быстрый расчёт или отправьте модель котла, фотографии и известные размеры менеджеру.",
    finalTitle: "Получите расчёт дымохода для ТТ-котла",
    formCommentPlaceholder: "Что уже известно: модель котла, топливо, диаметр патрубка, маршрут или размеры",
    formImage: "/images/home/scenario-tt-kotel.webp",
    formImageAlt: "Твердотопливный котёл и элементы дымохода в котельной",
    formTitle: "Не знаете параметры? Пришлите паспорт и фото",
    heroText:
      "Укажите параметры патрубка и маршрут котельной. Покажем предварительный состав, реальные товары и ориентировочную стоимость.",
    h1: "Рассчитайте дымоход для твердотопливного котла",
    inputDescription:
      "Начинаем с точной модели котла и его документации, затем уточняем подключение, маршрут и размеры объекта.",
    inputTitle: "Что нужно для расчёта дымохода ТТ-котла",
    leadSource: "solution-solid-fuel-boiler",
    seoCards: [
      {
        title: "Точная модель важнее одной мощности",
        text: "Мощность и вид топлива не заменяют паспорт котла. Для предварительного подбора нужны данные конкретной модели и параметры её выходного патрубка.",
      },
      {
        title: "Маршрут меняет состав комплекта",
        text: "Выход через конструкции здания и наружный подъём по фасаду требуют разной геометрии. Все повороты и участки учитываются в расчёте отдельно.",
      },
      {
        title: "Стоимость зависит от всей трассы",
        text: "На предварительную сумму влияют длины участков, изменения направления, проходные элементы, опоры и крепления, найденные в каталоге.",
      },
      {
        title: "Состав подтверждается перед заказом",
        text: "Менеджер сверяет исходные данные, найденные товары и позиции, которые требуют уточнения или не имеют подтверждённой цены.",
      },
    ],
    seoDescription:
      "Состав дымохода определяют по модели котла, паспортным данным, параметрам патрубка и полной геометрии маршрута.",
    seoTitle: "Как подбирают дымоход для твердотопливного котла",
    work: {
      description:
        "Медное озеро: дымоход 200/300 мм из нержавеющей стали AISI 321 для твердотопливного котла.",
      objectId: 3,
      title: "Выполненная работа: дымоход для ТТ-котла",
    },
  },
  gas: {
    breadcrumb: "Для газового котла",
    calculatorDescription:
      "Дом и газовый котёл уже выбраны. Укажите состояние оборудования, подключение, маршрут и известные размеры.",
    calculatorEyebrow: "Быстрый расчёт для газового котла",
    calculatorTitle: "Начните с модели и подключения",
    content: gasBoilerScenario,
    equipmentType: "gaz",
    explainerDescription:
      "Автоматический результат остаётся предварительным, пока не проверены модель котла, разрешённая система и условия объекта.",
    explainerTitle: "Что требует отдельной проверки",
    faqTitle: "Частые вопросы о дымоходе для газового котла",
    finalDescription:
      "Пройдите быстрый расчёт или отправьте модель котла, паспорт и фотографии предполагаемого маршрута.",
    finalTitle: "Получите предварительный расчёт для газового котла",
    formCommentPlaceholder: "Что уже известно: модель котла, тип системы, размеры подключения или маршрут",
    formImage: "/images/home/scenario-gaz.webp",
    formImageAlt: "Газовый котёл и элементы системы отвода продуктов сгорания",
    formTitle: "Пришлите модель котла и документацию",
    heroText:
      "Выберите маршрут и укажите известные параметры. Состав и применимость элементов проверим по документации конкретного котла.",
    h1: "Рассчитайте дымоход для газового котла",
    inputDescription:
      "Сначала фиксируем точную модель и разрешённую производителем систему, затем собираем данные о подключении и маршруте.",
    inputTitle: "Что нужно для расчёта системы газового котла",
    leadSource: "solution-gas-boiler",
    seoCards: [
      {
        title: "Начинаем с точной модели котла",
        text: "Тип камеры сгорания, допустимая конфигурация и компоненты определяются документацией конкретного оборудования, а не общим названием котла.",
      },
      {
        title: "Проверяем разрешённую систему",
        text: "Совпадение диаметра само по себе не подтверждает совместимость. До подбора изделий нужно определить допустимую производителем схему подключения.",
      },
      {
        title: "Учитываем весь маршрут",
        text: "В расчёте фиксируются направление, изменения трассы и известные размеры. Ограничения по конфигурации сверяются с руководством выбранной модели.",
      },
      {
        title: "Подключение проверяет специалист",
        text: "Предварительный подбор на сайте не заменяет проектирование, проверку и ввод газового оборудования в установленном порядке.",
      },
    ],
    seoDescription:
      "Для газового котла сначала проверяют точную модель, тип системы и допустимую конфигурацию, затем сопоставляют маршрут с товарами каталога.",
    seoTitle: "Как подбирают дымоход для газового котла",
  },
};

const reviews = [
  { author: "Алексей Чуб", text: "Отметил скорость работы, качество материалов и профессиональную работу замерщика." },
  { author: "Артем Богданов", text: "Заказывает здесь с 2018 года. Отметил нестандартное изготовление, выбор исполнения и цены." },
  { author: "Глеб Борисыч", text: "Давно сотрудничает с компанией. Положительно оценил качество, сроки и ответственность." },
];

const iconByName: Record<ScenarioIconName, Icon> = {
  building: Building,
  camera: Photo,
  file: FileDescription,
  flame: Flame,
  home: Building,
  route: Route,
  ruler: Ruler,
  shield: ShieldCheck,
  wrench: ShieldCheck,
};

function absoluteUrl(path: string) {
  return new URL(`${appBasePath}${path}`, appUrl).toString();
}

export function BoilerScenarioLanding({
  assetBasePath = "",
  kind,
}: {
  assetBasePath?: string;
  kind: BoilerKind;
}) {
  const config = configByKind[kind];
  const { content } = config;
  const canonicalUrl = absoluteUrl(`/solutions/${content.slug}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: content.metadata.title,
        description: content.metadata.description,
        inLanguage: "ru-RU",
        isPartOf: { "@id": `${new URL(appUrl).origin}/#website` },
        breadcrumb: { "@id": `${canonicalUrl}#breadcrumb` },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: absoluteUrl(content.heroImage),
          caption: content.heroImageAlt,
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Главная", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Решения", item: absoluteUrl("/solutions") },
          { "@type": "ListItem", position: 3, name: config.breadcrumb, item: canonicalUrl },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${canonicalUrl}#faq`,
        mainEntity: content.faq.map((item) => ({
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
            <span aria-current="page">{config.breadcrumb}</span>
          </nav>
        </div>

        <section className={styles.hero}>
          <div className={`${styles.shell} ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>{content.eyebrow}</p>
              <h1>{config.h1}</h1>
              <p className={styles.heroText}>{config.heroText}</p>
              <div className={styles.heroActions}>
                <a className={styles.primaryButton} href="#quick-estimate">
                  Рассчитать комплект <ArrowRight aria-hidden size={18} />
                </a>
                <a className={styles.secondaryButton} href="#help-with-selection">Отправить данные</a>
              </div>
            </div>
            <div className={styles.heroMedia}>
              <Image
                alt={content.heroImageAlt}
                fill
                fetchPriority="high"
                priority
                quality={84}
                sizes="(max-width: 820px) 100vw, 52vw"
                src={`${assetBasePath}${content.heroImage}`}
              />
            </div>
          </div>
        </section>

        <section className={styles.resultStrip} aria-label="Результат быстрого расчёта">
          <div className={styles.shell}>
            <div><strong>Предварительный результат</strong><span>после нескольких вопросов</span></div>
            <div><strong>Стоимость и состав</strong><span>после отправки контактов</span></div>
            <div><strong>Проверка менеджером</strong><span>перед оформлением заказа</span></div>
          </div>
        </section>

        <HomeQuickEstimate
          assetBasePath={assetBasePath}
          fixedEquipmentType={config.equipmentType}
          fixedObjectType="house"
          introDescription={config.calculatorDescription}
          introEyebrow={config.calculatorEyebrow}
          introTitle={config.calculatorTitle}
          leadSource={`${config.leadSource}-quick-estimate`}
        />

        <section className={styles.helpSection} id="help-with-selection" aria-labelledby="boiler-help-title">
          <div className={`${styles.shell} ${styles.helpGrid}`}>
            <div className={styles.helpVisual}>
              <Image
                alt={config.formImageAlt}
                fill
                sizes="(max-width: 820px) 100vw, 43vw"
                src={`${assetBasePath}${config.formImage}`}
              />
            </div>
            <div className={styles.helpPanel}>
              <div className={styles.sectionHeading}>
                <h2 id="boiler-help-title">{config.formTitle}</h2>
                <p>Добавьте фотографию, название модели или паспорт оборудования. Менеджер сообщит, какие данные нужно уточнить.</p>
              </div>
              <LeadForm
                attachmentLabel="Добавить фото или паспорт"
                commentPlaceholder={config.formCommentPlaceholder}
                source={`${config.leadSource}-help`}
                submitLabel="Оставить заявку"
                successMessage="Менеджер посмотрит материалы и сообщит, что нужно уточнить для подбора."
              />
            </div>
          </div>
        </section>

        <section className={styles.inputsSection} aria-labelledby="boiler-inputs-title">
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <h2 id="boiler-inputs-title">{config.inputTitle}</h2>
              <p>{config.inputDescription}</p>
            </div>
            <div className={styles.inputGrid}>
              {content.requiredInputs.map((item) => {
                const InputIcon = iconByName[item.icon];
                return (
                  <article key={item.title}>
                    <InputIcon aria-hidden size={24} strokeWidth={1.7} />
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {config.work ? (
          <section className={styles.worksSection} aria-labelledby="boiler-works-title">
            <div className={styles.shell}>
              <div className={styles.sectionHeading}>
                <h2 id="boiler-works-title">{config.work.title}</h2>
                <p>{config.work.description}</p>
              </div>
              <HomeWorksShowcase objectIds={[config.work.objectId]} />
            </div>
          </section>
        ) : null}

        <section className={styles.seoSection} aria-labelledby="boiler-selection-title">
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>Подбор комплекта</p>
              <h2 id="boiler-selection-title">{config.seoTitle}</h2>
              <p>{config.seoDescription}</p>
            </div>
            <div className={styles.seoGrid}>
              {config.seoCards.map((card) => (
                <article key={card.title}>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </article>
              ))}
            </div>
            <div className={styles.measurementCallout}>
              <div>
                <strong>Нужен расчёт по подробным размерам?</strong>
                <p>Сохраните замеры дома, оборудования и маршрута, чтобы менеджер мог проверить больше исходных данных.</p>
              </div>
              <Link className={styles.secondaryButton} href="/zamery?edit=1&object=house">
                Перейти к замерам <ArrowRight aria-hidden size={17} />
              </Link>
            </div>
          </div>
        </section>

        <SolutionTrustSections assetBasePath={assetBasePath} />

        <section className={styles.reviewsSection} aria-labelledby="boiler-reviews-title">
          <div className={`${styles.shell} ${styles.reviewsLayout}`}>
            <div className={styles.reviewsIntro}>
              <Image alt="" aria-hidden height={52} src={`${assetBasePath}/images/home/yandex-maps-icon-user-v6.png`} width={52} />
              <h2 id="boiler-reviews-title">Отзывы клиентов на Яндекс Картах</h2>
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

        <section className={styles.explainerSection} aria-labelledby="boiler-explainer-title">
          <div className={`${styles.shell} ${styles.explainerGrid}`}>
            <div>
              <h2 id="boiler-explainer-title">{config.explainerTitle}</h2>
              <p>{config.explainerDescription}</p>
            </div>
            <div className={styles.explainerColumns}>
              <article>
                <FileDescription aria-hidden size={25} />
                <h3>Оборудование</h3>
                <p>Сверяем точную модель, доступную документацию и параметры подключения.</p>
              </article>
              <article>
                <Route aria-hidden size={25} />
                <h3>Маршрут</h3>
                <p>Проверяем направление трассы, известные размеры и условия объекта.</p>
              </article>
              <article>
                <ShieldCheck aria-hidden size={25} />
                <h3>Состав</h3>
                <p>Подтверждаем найденные изделия и отдельно отмечаем позиции, которые требуют уточнения.</p>
              </article>
            </div>
          </div>
        </section>

        <section className={styles.faqSection} aria-labelledby="boiler-faq-title">
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <h2 id="boiler-faq-title">{config.faqTitle}</h2>
            </div>
            <div className={styles.faqList}>
              {content.faq.map((item) => (
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
              <h2>{config.finalTitle}</h2>
              <p>{config.finalDescription}</p>
            </div>
            <div className={styles.finalActions}>
              <a className={styles.primaryButton} href="#quick-estimate">Рассчитать комплект</a>
              <a className={styles.secondaryButton} href="#help-with-selection">Отправить данные</a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
