import Image from "next/image";
import Link from "next/link";
import {
  IconArrowRight as ArrowRight,
  IconCamera as Camera,
  IconChecklist as Checklist,
  IconExternalLink as ExternalLink,
  IconFileDescription as FileDescription,
  IconLayoutGrid as LayoutGrid,
  IconRoute as Route,
  IconShieldCheck as ShieldCheck,
  IconStarFilled as Star,
} from "@tabler/icons-react";
import { mangalScenario } from "@/lib/scenarioPages";
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
    icon: Camera,
    title: "Фото мангальной зоны",
    text: "Добавьте фото с общим видом очага, пространством над ним и возможным маршрутом системы.",
  },
  {
    icon: LayoutGrid,
    title: "Размеры очага и помещения",
    text: "Укажите известные ширину, глубину и высоту оборудования, а также основные размеры зоны установки.",
  },
  {
    icon: Route,
    title: "Предполагаемый маршрут",
    text: "Покажите, где может пройти дымоход, какие конструкции находятся на пути и где возможен выход наружу.",
  },
  {
    icon: FileDescription,
    title: "Адрес и задача",
    text: "Опишите, что уже установлено, какой результат нужен и требуется ли расчёт оборудования вместе с монтажом.",
  },
];

function absoluteUrl(path: string) {
  return new URL(`${appBasePath}${path}`, appUrl).toString();
}

export function MangalScenarioLanding({ assetBasePath = "" }: { assetBasePath?: string }) {
  const canonicalUrl = absoluteUrl("/solutions/mangalnaya-zona");
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: mangalScenario.metadata.title,
        description: mangalScenario.metadata.description,
        inLanguage: "ru-RU",
        isPartOf: { "@id": `${new URL(appUrl).origin}/#website` },
        breadcrumb: { "@id": `${canonicalUrl}#breadcrumb` },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: absoluteUrl(mangalScenario.heroImage),
          caption: mangalScenario.heroImageAlt,
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Главная", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Решения", item: absoluteUrl("/solutions") },
          { "@type": "ListItem", position: 3, name: "Для мангальной зоны", item: canonicalUrl },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${canonicalUrl}#faq`,
        mainEntity: mangalScenario.faq.map((item) => ({
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
            <span aria-current="page">Для мангальной зоны</span>
          </nav>
        </div>

        <section className={styles.hero}>
          <div className={`${styles.shell} ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <h1>Вытяжка и дымоход для мангальной зоны</h1>
              <p className={styles.heroText}>
                Пришлите фото и известные размеры объекта. Подготовим индивидуальный состав системы и перечень монтажных работ без универсального готового комплекта.
              </p>
              <div className={styles.heroActions}>
                <a className={styles.primaryButton} href="#project-request">
                  Получить расчёт по фото <ArrowRight aria-hidden size={18} />
                </a>
                <a className={styles.heroTextLink} href="#completed-mangal">
                  Посмотреть выполненную работу <ArrowRight aria-hidden size={17} />
                </a>
              </div>
            </div>
            <div className={styles.heroMedia}>
              <Image
                alt={mangalScenario.heroImageAlt}
                fill
                fetchPriority="high"
                priority
                quality={84}
                sizes="(max-width: 820px) 100vw, 52vw"
                src={`${assetBasePath}${mangalScenario.heroImage}`}
              />
            </div>
          </div>
        </section>

        <section className={styles.resultStrip} aria-label="Что входит в расчёт">
          <div className={styles.shell}>
            <div><strong>Исходные данные</strong><span>фото и размеры объекта</span></div>
            <div><strong>Состав системы</strong><span>зонт, дымоход и оборудование</span></div>
            <div><strong>Отдельная смета</strong><span>материалы и монтажные работы</span></div>
          </div>
        </section>

        <section className={styles.helpSection} id="project-request" aria-labelledby="mangal-request-title">
          <div className={`${styles.shell} ${styles.helpGrid}`}>
            <div className={styles.helpVisual}>
              <Image
                alt="Наружный участок системы дымоудаления мангальной зоны на кровле"
                fill
                sizes="(max-width: 820px) 100vw, 43vw"
                src={`${assetBasePath}/images/solutions/mangal/request-form.webp`}
              />
            </div>
            <div className={styles.helpPanel}>
              <div className={styles.sectionHeading}>
                <h2 id="mangal-request-title">Пришлите фото мангальной зоны</h2>
                <p>Начните с фото и известных размеров. Специалист изучит объект и сообщит, какие данные потребуются для расчёта.</p>
              </div>
              <LeadForm
                attachmentLabel="Добавить фото или план"
                commentPlaceholder="Адрес, размеры мангала и помещения, что уже установлено и какой результат нужен"
                configuration="Сценарий: вытяжка и дымоход для мангальной зоны"
                source="solution-mangal-project"
                submitLabel="Отправить на расчёт"
                successMessage="Менеджер изучит материалы и свяжется с вами для уточнения системы дымоудаления."
              />
            </div>
          </div>
        </section>

        <section className={styles.seoSection} aria-labelledby="mangal-system-title">
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <h2 id="mangal-system-title">Что может войти в систему</h2>
              <p>Состав определяем по мангальной зоне и маршруту. Размеры и характеристики оборудования не назначаем только по фото.</p>
            </div>
            <div className={styles.seoGrid}>
              <article>
                <h3>Вытяжной зонт</h3>
                <p>Форма и размеры зонта связываются с фактическим очагом и местом установки. Для начала расчёта нужны фото и основные размеры зоны.</p>
              </article>
              <article>
                <h3>Дымоход для мангала</h3>
                <p>Маршрут фиксируем от зонта до выхода наружу с учётом помещения, кровли и конструкций на пути. Итоговый состав формируется для конкретного объекта.</p>
              </article>
              <article>
                <h3>Вытяжной вентилятор</h3>
                <p>Необходимость вентилятора и его параметры определяются после сбора исходных данных. На выполненном объекте использованы два дымососа с плавной регулировкой частоты вращения.</p>
              </article>
              <article>
                <h3>Монтаж системы дымоудаления</h3>
                <p>В смете разделяем оборудование, дымоходы, зонты и монтажные работы. Точный перечень согласовывается после проверки объекта.</p>
              </article>
            </div>
            <div className={styles.measurementCallout}>
              <div>
                <strong>Мангальная зона уже построена?</strong>
                <p>Пришлите общий вид, очаг, потолок или кровлю и предполагаемый выход дымохода. По материалам определим, какие размеры нужно уточнить.</p>
              </div>
              <a className={styles.secondaryButton} href="#project-request">
                Отправить материалы <ArrowRight aria-hidden size={17} />
              </a>
            </div>
          </div>
        </section>

        <section className={styles.worksSection} id="completed-mangal" aria-labelledby="mangal-works-title">
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <h2 id="mangal-works-title">Система дымоудаления в деревне Красноозерье</h2>
              <p>Установлены два вытяжных зонта с дымоходами и вытяжными вентиляторами с плавной регулировкой частоты вращения.</p>
            </div>
            <HomeWorksShowcase objectIds={[9]} />
          </div>
        </section>

        <section className={styles.inputsSection} aria-labelledby="mangal-inputs-title">
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <h2 id="mangal-inputs-title">Что понадобится для предварительного расчёта</h2>
              <p>Не обязательно знать все параметры заранее. Начните с имеющихся материалов, а недостающие данные зафиксируем для уточнения.</p>
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

        <section className={styles.explainerSection} aria-labelledby="mangal-process-title">
          <div className={`${styles.shell} ${styles.explainerGrid}`}>
            <div>
              <h2 id="mangal-process-title">Как проходит расчёт системы</h2>
              <p>Сначала собираем данные по очагу и объекту, затем согласовываем состав оборудования и работ.</p>
            </div>
            <div className={styles.explainerColumns}>
              <article>
                <Camera aria-hidden size={25} />
                <h3>Фото и размеры</h3>
                <p>Вы отправляете общий вид зоны, известные размеры, адрес и описание задачи.</p>
              </article>
              <article>
                <Checklist aria-hidden size={25} />
                <h3>Состав и смета</h3>
                <p>Определяем, какие зонты, участки дымохода, оборудование и работы нужно включить в расчёт.</p>
              </article>
              <article>
                <ShieldCheck aria-hidden size={25} />
                <h3>Согласование</h3>
                <p>До заказа фиксируем состав, стоимость и исходные данные, которые ещё требуют проверки.</p>
              </article>
            </div>
          </div>
        </section>

        <SolutionTrustSections assetBasePath={assetBasePath} />

        <section className={styles.reviewsSection} aria-labelledby="mangal-reviews-title">
          <div className={`${styles.shell} ${styles.reviewsLayout}`}>
            <div className={styles.reviewsIntro}>
              <Image alt="" aria-hidden height={52} src={`${assetBasePath}/images/home/yandex-maps-icon-user-v6.png`} width={52} />
              <h2 id="mangal-reviews-title">Отзывы клиентов на Яндекс Картах</h2>
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

        <section className={styles.faqSection} aria-labelledby="mangal-faq-title">
          <div className={styles.shell}>
            <div className={styles.sectionHeading}>
              <h2 id="mangal-faq-title">Частые вопросы о вытяжке и дымоходе для мангала</h2>
            </div>
            <div className={styles.faqList}>
              {mangalScenario.faq.map((item) => (
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
              <h2>Получите расчёт системы по вашему объекту</h2>
              <p>Пришлите фото и известные размеры. Начнём с имеющихся данных и составим список необходимых уточнений.</p>
            </div>
            <div className={styles.finalActions}>
              <a className={styles.primaryButton} href="#project-request">Получить расчёт по фото</a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
