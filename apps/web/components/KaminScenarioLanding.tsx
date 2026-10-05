import Image from "next/image";
import Link from "next/link";
import {
  IconArrowRight as ArrowRight,
  IconCamera as Camera,
  IconChecklist as Checklist,
  IconExternalLink as ExternalLink,
  IconFileDescription as FileDescription,
  IconFlame as Flame,
  IconLayoutGrid as LayoutGrid,
  IconRoute as Route,
  IconShieldCheck as ShieldCheck,
  IconStarFilled as Star,
} from "@tabler/icons-react";
import { kaminScenario } from "@/lib/scenarioPages";
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
    title: "Модель и паспорт топки",
    text: "Название модели, параметры выходного патрубка и доступная документация производителя.",
  },
  {
    icon: Camera,
    title: "Фото и план помещения",
    text: "Общий вид места установки, этажи, перекрытия, кровля и предполагаемая зона камина.",
  },
  {
    icon: Route,
    title: "Маршрут дымохода",
    text: "Новая трасса через дом или подключение к существующему каналу с его размерами и фотографиями.",
  },
  {
    icon: LayoutGrid,
    title: "Короб и видимая часть",
    text: "Пожелания к декоративному коробу и участкам дымохода, которые останутся в интерьере.",
  },
];

function absoluteUrl(path: string) {
  return new URL(`${appBasePath}${path}`, appUrl).toString();
}

export function KaminScenarioLanding({ assetBasePath = "" }: { assetBasePath?: string }) {
  const canonicalUrl = absoluteUrl("/solutions/kamin");
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: kaminScenario.metadata.title,
        description: kaminScenario.metadata.description,
        inLanguage: "ru-RU",
        isPartOf: { "@id": `${new URL(appUrl).origin}/#website` },
        breadcrumb: { "@id": `${canonicalUrl}#breadcrumb` },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: absoluteUrl(kaminScenario.heroImage),
          caption: kaminScenario.heroImageAlt,
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Главная", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Решения", item: absoluteUrl("/solutions") },
          { "@type": "ListItem", position: 3, name: "Дымоход и монтаж камина", item: canonicalUrl },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${canonicalUrl}#faq`,
        mainEntity: kaminScenario.faq.map((item) => ({
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
            <span aria-current="page">Для камина</span>
          </nav>
        </div>

        <section className={styles.hero}>
          <div className={`${styles.shell} ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Камин в доме</p>
              <h1>Дымоход и монтаж каминной топки под ключ</h1>
              <p className={styles.heroText}>
                Оставьте контакты для подбора по вашему объекту; паспорт топки, план или фото можно приложить по желанию. Быстрый расчёт покажет предварительную стоимость комплектующих дымохода, а монтаж топки, короб и другие работы рассчитаем отдельно.
              </p>
              <div className={styles.heroActions}>
                <a className={styles.primaryButton} href="#quick-estimate">
                  Рассчитать дымоход <ArrowRight aria-hidden size={18} />
                </a>
                <a className={styles.secondaryButton} href="#completed-fireplace">Посмотреть работу</a>
              </div>
            </div>
            <div className={styles.heroMedia}>
              <Image
                alt={kaminScenario.heroImageAlt}
                fill
                fetchPriority="high"
                priority
                quality={84}
                sizes="(max-width: 820px) 100vw, 52vw"
                src={`${assetBasePath}${kaminScenario.heroImage}`}
              />
            </div>
          </div>
        </section>

        <section className={styles.resultStrip} aria-label="Что учитываем в проекте камина">
          <div className={styles.shell}>
            <div><strong>Модель топки</strong><span>паспорт и подключение</span></div>
            <div><strong>Дымоход и короб</strong><span>по объекту и маршруту</span></div>
            <div><strong>Индивидуальная смета</strong><span>материалы и работы отдельно</span></div>
          </div>
        </section>

        <HomeQuickEstimate
          assetBasePath={assetBasePath}
          fixedEquipmentType="kamin"
          fixedObjectType="house"
          introDescription="Дом и камин уже выбраны. Укажите состояние топки, положение и диаметр патрубка, маршрут и примерные размеры трассы."
          introEyebrow="Быстрый расчёт для камина"
          introTitle="Рассчитайте дымоход за четыре шага"
          leadSource="solution-kamin-quick-estimate"
        />

        <section className={styles.helpSection} id="project-request" aria-labelledby="kamin-request-title">
          <div className={`${styles.shell} ${styles.helpGrid}`}>
            <div className={styles.helpVisual}>
              <Image
                alt="Подключение каминной топки к дымоходу во время монтажа"
                fill
                sizes="(max-width: 820px) 100vw, 43vw"
                src={`${assetBasePath}/images/works/object-6/03.webp`}
              />
            </div>
            <div className={styles.helpPanel}>
              <div className={styles.sectionHeading}>
                <p className={styles.eyebrow}>Индивидуальный расчёт</p>
                <h2 id="kamin-request-title">Нужен подбор для камина? Оставьте заявку</h2>
                <p>Менеджер перезвонит и уточнит модель топки и данные объекта. Если есть паспорт, план или фото, прикрепите их по желанию для более предметного разговора.</p>
              </div>
              <LeadForm
                attachmentLabel="Добавить фото, план или паспорт"
                commentPlaceholder="Модель топки, адрес объекта, что уже построено и какой результат нужен"
                configuration="Сценарий: дымоход и монтаж каминной топки"
                source="solution-kamin-project"
                submitLabel="Оставить заявку"
                successMessage="Менеджер перезвонит для уточнения проекта камина."
              />
            </div>
          </div>
        </section>

        <section className={styles.inputsSection} aria-labelledby="kamin-inputs-title">
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <h2 id="kamin-inputs-title">Что понадобится для расчёта камина</h2>
              <p>Для предварительной оценки можно начать с известных данных. В быстром расчёте используются типовые размеры, а перед заказом менеджер уточняет параметры топки и объекта.</p>
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

        <section className={styles.worksSection} id="completed-fireplace" aria-labelledby="kamin-works-title">
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>Выполненная работа</p>
              <h2 id="kamin-works-title">Каминная топка под ключ в КП «Дворянская усадьба»</h2>
              <p>В проект вошли дымоход, герметизация кровли, каркас декоративного короба и обшивка материалом из силиката кальция SILCA.</p>
            </div>
            <HomeWorksShowcase objectIds={[6]} />
          </div>
        </section>

        <section className={styles.seoSection} aria-labelledby="kamin-scope-title">
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>Состав проекта</p>
              <h2 id="kamin-scope-title">Дымоход и монтаж каминной топки</h2>
              <p>Состав материалов и работ определяем по модели топки, маршруту дымохода и особенностям объекта.</p>
            </div>
            <div className={styles.seoGrid}>
              <article>
                <h3>Дымоход для камина</h3>
                <p>Начинаем с модели топки, параметров выходного патрубка и маршрута. Затем уточняем этажи, перекрытия, кровлю и точки крепления по данным объекта.</p>
              </article>
              <article>
                <h3>Монтаж каминной топки</h3>
                <p>В расчёте связываем место установки топки с подключением и будущей трассой. Если части проекта ещё нет, фиксируем, какие сведения нужно получить до окончательной сметы.</p>
              </article>
              <article>
                <h3>Камин под ключ</h3>
                <p>В состав работ могут войти установка топки и дымохода, герметизация кровельного примыкания, каркас и обшивка декоративного короба. Перечень согласовывается для конкретного проекта.</p>
              </article>
              <article>
                <h3>Подключение к существующему каналу</h3>
                <p>До подбора решения нужны размеры, маршрут и сведения о состоянии канала. Сам факт его наличия не подтверждает совместимость с выбранной каминной топкой.</p>
              </article>
            </div>
            <div className={styles.measurementCallout}>
              <div>
                <strong>Есть только фотографии или эскиз?</strong>
                <p>Этого достаточно, чтобы начать сбор исходных данных. После просмотра материалов менеджер сообщит, что нужно измерить или уточнить.</p>
              </div>
              <a className={styles.secondaryButton} href="#project-request">
                Оставить заявку <ArrowRight aria-hidden size={17} />
              </a>
            </div>
          </div>
        </section>

        <SolutionTrustSections assetBasePath={assetBasePath} fireplace />

        <section className={styles.reviewsSection} aria-labelledby="kamin-reviews-title">
          <div className={`${styles.shell} ${styles.reviewsLayout}`}>
            <div className={styles.reviewsIntro}>
              <Image alt="" aria-hidden height={52} src={`${assetBasePath}/images/home/yandex-maps-icon-user-v6.png`} width={52} />
              <h2 id="kamin-reviews-title">Отзывы клиентов на Яндекс Картах</h2>
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

        <section className={styles.explainerSection} aria-labelledby="kamin-process-title">
          <div className={`${styles.shell} ${styles.explainerGrid}`}>
            <div>
              <h2 id="kamin-process-title">Как проходит расчёт проекта</h2>
              <p>Сначала собираем подтверждённые исходные данные, затем формируем состав дымохода и перечень работ для согласования.</p>
            </div>
            <div className={styles.explainerColumns}>
              <article>
                <FileDescription aria-hidden size={25} />
                <h3>Исходные данные</h3>
                <p>Проверяем модель топки, документацию, фотографии, план и известные размеры объекта.</p>
              </article>
              <article>
                <Checklist aria-hidden size={25} />
                <h3>Состав и смета</h3>
                <p>Разделяем изделия дымохода, дополнительные материалы и монтажные работы.</p>
              </article>
              <article>
                <ShieldCheck aria-hidden size={25} />
                <h3>Согласование</h3>
                <p>До заказа фиксируем состав проекта, стоимость и данные, которые ещё требуют проверки.</p>
              </article>
            </div>
          </div>
        </section>

        <section className={styles.faqSection} aria-labelledby="kamin-faq-title">
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <h2 id="kamin-faq-title">Частые вопросы о дымоходе и монтаже камина</h2>
            </div>
            <div className={styles.faqList}>
              {kaminScenario.faq.map((item) => (
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
              <h2>Получите расчёт камина под ваш дом</h2>
              <p>Отправьте модель топки, фотографии или план. Начнём с имеющихся данных и составим список необходимых уточнений.</p>
            </div>
            <div className={styles.finalActions}>
              <a className={styles.primaryButton} href="#project-request">Оставить заявку</a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
