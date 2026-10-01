import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  IconArrowRight as ArrowRight,
  IconAssembly as Structure,
  IconBuildingFactory2 as Factory,
  IconFileDescription as FileDescription,
  IconMail as Mail,
  IconPhone as Phone,
  IconPlus as Plus,
  IconRulerMeasure as RulerMeasure,
  IconTool as Tool,
} from "@tabler/icons-react";
import { IndustrialTagline } from "@/components/IndustrialTagline";
import { LeadForm } from "@/components/LeadForm";
import styles from "./page.module.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dimohod-trade.pro";
const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const assetBasePath = process.env.NEXT_BASE_PATH ?? "";
const pagePath = "/promyshlennye-dymohody";

const title = "Промышленные дымоходы до 1000 мм на заказ | Дымоход Трейд";
const description =
  "Изготовление промышленных дымоходов и конструкций под параметры объекта. Трубы диаметром до 1000 мм и толщиной металла до 1,25 мм.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: pagePath },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: pagePath,
    title,
    description,
    images: [{
      url: "/images/industrial-chimneys/twin-facade-system.webp",
      width: 960,
      height: 1280,
      alt: "Два промышленных дымохода на фасаде производственного здания",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/images/industrial-chimneys/twin-facade-system.webp"],
  },
};

const projectImages = [
  {
    src: "/images/industrial-chimneys/support-towers.webp",
    alt: "Дымовые каналы на самостоятельных опорных конструкциях",
    caption: "Каналы на самостоятельных опорных конструкциях",
  },
  {
    src: "/images/industrial-chimneys/facade-connection-stage.webp",
    alt: "Подключение двух промышленных дымоходов к зданию на этапе монтажа",
    caption: "Узлы подключения на этапе монтажа",
  },
  {
    src: "/images/industrial-chimneys/twin-outlets.webp",
    alt: "Верхние участки двух промышленных дымоходов",
    caption: "Верхние участки каналов",
  },
  {
    src: "/images/industrial-chimneys/roof-level-detail.webp",
    alt: "Промышленные дымоходы у уровня кровли",
    caption: "Узлы у уровня кровли",
  },
  {
    src: "/images/industrial-chimneys/facade-installation-lift.webp",
    alt: "Монтаж двух вертикальных дымоходов с подъёмной платформы",
    caption: "Монтаж вертикальных участков",
  },
  {
    src: "/images/industrial-chimneys/connection-installation.webp",
    alt: "Горизонтальный участок промышленного дымохода во время монтажа",
    caption: "Формирование горизонтального участка",
  },
];

const faq = [
  {
    question: "Какие исходные данные нужны для расчёта?",
    answer:
      "Можно начать с чертежа, спецификации или фотографий объекта. Для точного предложения специалист уточнит оборудование, размеры канала, маршрут и точки крепления.",
  },
  {
    question: "Какой максимальный диаметр можно изготовить?",
    answer: "Изготавливаем трубы диаметром до 1000 мм. Конкретные параметры согласуются по заданию на объект.",
  },
  {
    question: "Какая максимальная толщина металла?",
    answer: "Для изготовления труб принимаем задания с толщиной металла до 1,25 мм.",
  },
  {
    question: "Учитываются ли несущие конструкции?",
    answer:
      "Да, конструкции рассматриваются вместе с маршрутом дымохода и условиями объекта. Конкретное решение определяется после получения исходных данных.",
  },
  {
    question: "Можно ли начать расчёт только по фотографиям?",
    answer:
      "Фотографий достаточно для первого разбора. После него специалист перечислит размеры и документы, которые потребуются для продолжения работы.",
  },
  {
    question: "Когда будет известна стоимость?",
    answer:
      "Стоимость рассчитывается после уточнения размеров, состава элементов, конструкций и объёма работ. Отправьте имеющиеся материалы, чтобы начать расчёт.",
  },
];

function absoluteUrl(path: string) {
  return new URL(`${appBasePath}${path}`, appUrl).toString();
}

export default function IndustrialChimneysPage() {
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
        isPartOf: { "@id": `${new URL(appUrl).origin}/#website` },
        breadcrumb: { "@id": `${canonicalUrl}#breadcrumb` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Главная", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Промышленные дымоходы", item: canonicalUrl },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${canonicalUrl}#faq`,
        mainEntity: faq.map((item) => ({
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
      <main className={styles.page} id="main-content">
        <section className={styles.hero}>
          <div className={styles.shell}>
            <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
              <Link href="/">Главная</Link><span aria-hidden>/</span><span aria-current="page">Промышленные дымоходы</span>
            </nav>
            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                <p className={styles.eyebrow}>Промышленные системы</p>
                <h1>Промышленные дымоходы на заказ</h1>
                <p className={styles.heroLead}>
                  Изготавливаем трубы и конструкции под проект. Принимаем чертежи,
                  спецификации и фотографии действующей системы.
                </p>
                <div className={styles.heroActions}>
                  <a className={styles.primaryAction} href="#industrial-request">
                    Получить расчёт <ArrowRight aria-hidden size={18} />
                  </a>
                  <a className={styles.secondaryAction} href="#industrial-project">
                    Посмотреть объект
                  </a>
                </div>
              </div>
              <figure className={styles.heroVisual}>
                <Image
                  src={`${assetBasePath}/images/industrial-chimneys/twin-facade-system.webp`}
                  alt="Два промышленных дымохода, смонтированных на фасаде здания"
                  fill
                  priority
                  sizes="(max-width: 760px) 100vw, 52vw"
                />
              </figure>
            </div>
          </div>
        </section>

        <section className={styles.factBand} aria-label="Возможности изготовления">
          <div className={`${styles.shell} ${styles.factGrid}`}>
            <div><strong>до 1000 мм</strong><span>диаметр трубы</span></div>
            <div><strong>до 1,25 мм</strong><span>толщина металла</span></div>
            <div><strong>Под проект</strong><span>трубы, узлы и конструкции</span></div>
          </div>
        </section>

        <section className={styles.capabilities}>
          <div className={styles.shell}>
            <header className={styles.sectionHeading}>
              <h2>Что входит в проработку</h2>
              <p>Состав предложения формируется из фактических параметров оборудования, маршрута и объекта.</p>
            </header>
            <div className={styles.capabilityRows}>
              <article>
                <span><RulerMeasure aria-hidden size={23} /></span>
                <div><h3>Трубы под проект</h3><p>Изготовление по согласованным диаметрам и толщине металла в пределах производственных возможностей.</p></div>
              </article>
              <article>
                <span><Structure aria-hidden size={23} /></span>
                <div><h3>Несущие конструкции</h3><p>Конструкции рассматриваются вместе с трассой, точками крепления и исходными данными здания.</p></div>
              </article>
              <article>
                <span><FileDescription aria-hidden size={23} /></span>
                <div><h3>Состав системы</h3><p>Узлы и элементы собираются в предложение после проверки чертежей, спецификации или материалов с объекта.</p></div>
              </article>
            </div>
          </div>
        </section>

        <section className={styles.taglineSection} aria-label="Комплексная заявка">
          <div className={styles.shell}><IndustrialTagline /></div>
        </section>

        <section className={styles.project} id="industrial-project">
          <div className={styles.shell}>
            <header className={styles.sectionHeading}>
              <h2>Промышленные системы на реальных объектах</h2>
              <p>Фотографии показывают разные узлы, варианты опоры и этапы наружного монтажа.</p>
            </header>
            <div className={styles.projectGrid}>
              {projectImages.map((image, index) => (
                <figure className={index === 0 ? styles.projectLarge : undefined} key={image.src}>
                  <div className={styles.projectPhoto}>
                    <Image
                      src={`${assetBasePath}${image.src}`}
                      alt={image.alt}
                      fill
                      loading="lazy"
                      sizes={index === 0 ? "(max-width: 760px) 100vw, 48vw" : "(max-width: 760px) 50vw, 24vw"}
                    />
                  </div>
                  <figcaption>{image.caption}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.process}>
          <div className={styles.shell}>
            <header className={styles.sectionHeading}>
              <h2>Как начать работу</h2>
              <p>Необязательно собирать полный комплект документов до первого обращения.</p>
            </header>
            <ol>
              <li><div><h3>Передайте исходные данные</h3><p>Прикрепите чертёж, спецификацию, фотографии или кратко опишите задачу.</p></div></li>
              <li><div><h3>Уточним параметры</h3><p>Специалист проверит размеры, маршрут, оборудование и сведения о конструкциях.</p></div></li>
              <li><div><h3>Согласуем предложение</h3><p>Вы получите состав системы и стоимость после проверки исходных данных.</p></div></li>
            </ol>
          </div>
        </section>

        <section className={styles.faq}>
          <div className={styles.shell}>
            <header className={styles.sectionHeading}><h2>Вопросы перед расчётом</h2></header>
            <div className={styles.faqList}>
              {faq.map((item) => (
                <details key={item.question}>
                  <summary>{item.question}<Plus aria-hidden size={20} /></summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.request} id="industrial-request">
          <div className={`${styles.shell} ${styles.requestGrid}`}>
            <div className={styles.requestCopy}>
              <Factory aria-hidden size={36} />
              <h2>Получите расчёт промышленного дымохода</h2>
              <p>Отправьте имеющиеся материалы. Если данных не хватит, специалист перечислит, что нужно уточнить.</p>
              <div className={styles.contacts}>
                <a href="tel:+79650756555"><Phone aria-hidden size={17} />+7 (965) 075-65-55</a>
                <a href="mailto:office@dimohod-trade.pro"><Mail aria-hidden size={17} />office@dimohod-trade.pro</a>
              </div>
            </div>
            <div className={styles.formPanel}>
              <LeadForm
                attachmentLabel="Чертёж, спецификация или фото"
                commentPlaceholder="Оборудование, диаметр, маршрут и известные размеры"
                configuration="Промышленные дымоходы: диаметр до 1000 мм, толщина металла до 1,25 мм"
                source="industrial-chimneys"
                submitLabel="Получить расчёт"
                successMessage="Специалист проверит материалы по промышленному дымоходу и свяжется с вами."
              />
            </div>
          </div>
        </section>

      </main>
    </>
  );
}
