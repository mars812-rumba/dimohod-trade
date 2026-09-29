import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  IconArrowRight as ArrowRight,
  IconBuildingFactory2 as Factory,
  IconClock as Clock,
  IconCut as Cut,
  IconFileTypePdf as FilePdf,
  IconLayersLinked as Layers,
  IconMapPin as MapPin,
  IconPhone as Phone,
  IconSparkles as Sparkles,
  IconTruckDelivery as TruckDelivery,
} from "@tabler/icons-react";
import styles from "./page.module.css";

const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const title = "О компании «Дымоход Трейд» — производство дымоходов";
const description =
  "Дымоход Трейд производит модульные дымоходы из нержавеющей стали в Санкт-Петербурге и помогает рассчитать совместимый комплект с итоговой сметой.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/about" },
  openGraph: {
    title,
    description,
    type: "website",
    url: "/about",
    locale: "ru_RU",
    images: [
      {
        url: "/images/about/about-social.webp",
        width: 1200,
        height: 630,
        alt: "Производство модульных дымоходов Дымоход Трейд",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/images/about/about-social.webp"],
  },
};

const aboutJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": "https://dimohod-trade.pro/about#webpage",
  url: "https://dimohod-trade.pro/about",
  name: title,
  description,
  inLanguage: "ru-RU",
  about: {
    "@type": "Organization",
    "@id": "https://dimohod-trade.pro/#organization",
    name: "Дымоход Трейд",
    legalName: "ООО «Дымоходы-трейд плюс»",
    foundingDate: "2014",
    url: "https://dimohod-trade.pro/",
    telephone: "+7 965 075-65-55",
    email: "office@dimohod-trade.pro",
    address: {
      "@type": "PostalAddress",
      streetAddress: "ул. 2-й Луч, 4, корп. 2",
      addressLocality: "Санкт-Петербург",
      addressCountry: "RU",
    },
  },
};

function imagePath(name: string) {
  return `${appBasePath}/images/about/${name}`;
}

export default function AboutPage() {
  return (
    <main className={styles.main}>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
        type="application/ld+json"
      />

      <section className={styles.hero}>
        <div className={`${styles.shell} ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <p className={styles.since}>Санкт-Петербург · работаем с 2014 года</p>
            <h1>Производим дымоходы и помогаем собрать систему целиком</h1>
            <p className={styles.heroLead}>
              «Дымоход Трейд» производит модульные дымоходы из нержавеющей стали.
              На сайте можно рассчитать предварительный комплект или выбрать отдельные
              изделия, а менеджер проверит исходные данные и подготовит окончательную смету.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryAction} href="/bystryy-raschet#quick-estimate">
                Рассчитать за 2 минуты <ArrowRight aria-hidden size={18} />
              </Link>
              <Link className={styles.secondaryAction} href="/catalog">
                Перейти в каталог
              </Link>
            </div>
          </div>

          <figure className={styles.heroMedia}>
            <Image
              alt="Сотрудник Дымоход Трейд рядом со станком лазерной резки"
              height={1448}
              priority
              sizes="(max-width: 820px) 100vw, 48vw"
              src={imagePath("production-hero.webp")}
              width={1086}
            />
            <figcaption>
              <Factory aria-hidden size={17} /> Производство в Санкт-Петербурге
            </figcaption>
          </figure>
        </div>
      </section>

      <section className={styles.equipmentSection} aria-labelledby="equipment-title">
        <div className={styles.shell}>
          <header className={styles.sectionHeading}>
            <h2 id="equipment-title">Технология видна в деталях</h2>
            <p>
              Мы показываем оборудование и материалы без абстрактных обещаний о качестве.
              Вот три факта о производстве, которые можно проверить.
            </p>
          </header>

          <div className={styles.equipmentGrid}>
            <article>
              <Cut aria-hidden size={30} strokeWidth={1.55} />
              <h3>Лазерный раскрой</h3>
              <p>Станок российского производства для раскроя листового металла.</p>
            </article>
            <article>
              <Sparkles aria-hidden size={30} strokeWidth={1.55} />
              <h3>Лазерная сварка швов</h3>
              <p>Оборудование немецкого производства для формирования продольного шва.</p>
            </article>
            <article>
              <Layers aria-hidden size={30} strokeWidth={1.55} />
              <h3>ROCKWOOL WIRED MAT 105</h3>
              <p>Изоляционный материал плотностью 105 кг/м³ для утеплённых элементов.</p>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.productionSection} aria-labelledby="production-title">
        <div className={styles.shell}>
          <div className={styles.productionIntro}>
            <h2 id="production-title">Производство, которое можно увидеть</h2>
            <p>
              На одном участке выполняются операции с металлом, сборка элементов и подготовка
              готовых изделий. Эти фотографии сделаны в рабочем цехе, а не в выставочном зале.
            </p>
          </div>

          <div className={styles.productionGallery}>
            <figure className={styles.galleryMain}>
              <Image
                alt="Рабочий цех Дымоход Трейд с сотрудниками и элементами дымоходов"
                height={1448}
                sizes="(max-width: 760px) 100vw, 62vw"
                src={imagePath("active-workshop.webp")}
                width={1086}
              />
              <figcaption>Рабочий цех и текущие заказы</figcaption>
            </figure>
            <div className={styles.gallerySide}>
              <figure>
                <Image
                  alt="Оборудование для лазерной сварки швов"
                  height={1448}
                  sizes="(max-width: 760px) 100vw, 31vw"
                  src={imagePath("laser-seam-welding.webp")}
                  width={1086}
                />
                <figcaption>Лазерная сварка швов</figcaption>
              </figure>
              <figure>
                <Image
                  alt="Ручная сборка элемента модульного дымохода"
                  height={1448}
                  sizes="(max-width: 760px) 100vw, 31vw"
                  src={imagePath("manual-assembly.webp")}
                  width={1086}
                />
                <figcaption>Сборка элемента</figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.materialSection} aria-labelledby="material-title">
        <div className={`${styles.shell} ${styles.materialGrid}`}>
          <figure className={styles.materialMedia}>
            <Image
              alt="Рулон изоляции ROCKWOOL WIRED MAT 105 на производственном участке"
              height={1280}
              sizes="(max-width: 760px) 100vw, 46vw"
              src={imagePath("rockwool-insulation.webp")}
              width={960}
            />
          </figure>
          <div className={styles.materialCopy}>
            <h2 id="material-title">Материал системы так же важен, как обработка металла</h2>
            <p>
              Для утеплённых элементов используется ROCKWOOL WIRED MAT 105 плотностью
              105 кг/м³. На странице мы называем конкретный материал, чтобы покупатель понимал,
              что находится между внутренним и наружным контурами дымохода.
            </p>
            <p className={styles.materialNote}>
              Рабочие температуры и область применения материала указываются только по паспорту
              производителя и документации на конкретное изделие.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.approachSection} aria-labelledby="approach-title">
        <div className={`${styles.shell} ${styles.approachGrid}`}>
          <div className={styles.approachCopy}>
            <h2 id="approach-title">Не просто отдельные трубы, а понятная система</h2>
            <p>
              Наш сайт построен вокруг подбора комплекта. В карточках товаров указаны назначение,
              применение, рекомендации по подбору и монтажу, а также совместимые изделия.
            </p>
            <ul>
              <li>Можно начать с готового сценария или параметров отопительного оборудования.</li>
              <li>Калькулятор показывает предварительный состав и ориентировочную стоимость.</li>
              <li>Перед заказом менеджер проверяет исходные данные и состав комплекта.</li>
            </ul>
            <p className={styles.approachFootnote}>
              Такой подход помогает заранее увидеть систему целиком — то, чего обычно не хватает
              при выборе отдельных труб на маркетплейсе.
            </p>
          </div>
          <figure className={styles.approachMedia}>
            <Image
              alt="Готовые модульные трубы и комплектующие в цехе Дымоход Трейд"
              height={1448}
              sizes="(max-width: 820px) 100vw, 44vw"
              src={imagePath("finished-chimney-components.webp")}
              width={1086}
            />
            <figcaption>Готовые элементы перед комплектацией заказа</figcaption>
          </figure>
        </div>
      </section>

      <section className={styles.processSection} aria-labelledby="process-title">
        <div className={`${styles.shell} ${styles.processGrid}`}>
          <div className={styles.processIntro}>
            <h2 id="process-title">От первого расчёта до точной сметы</h2>
            <p>
              Начать можно онлайн, а окончательное решение формируется после проверки менеджером.
            </p>
            <div className={styles.processActions}>
              <Link href="/bystryy-raschet#quick-estimate">
                Начать расчёт <ArrowRight aria-hidden size={17} />
              </Link>
              <Link href="/catalog">Выбрать изделия</Link>
            </div>
          </div>

          <ol className={styles.steps}>
            <li>
              <span>01</span>
              <div>
                <h3>Получите предварительный расчёт</h3>
                <p>
                  Ответьте на несколько вопросов примерно за две минуты либо выберите нужные
                  изделия самостоятельно в каталоге.
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Уточните детали с менеджером</h3>
                <p>
                  После заявки менеджер свяжется с вами — ориентир до 15 минут — и проверит
                  оборудование, маршрут дымохода и параметры заказа.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Получите окончательный расчёт</h3>
                <p>
                  После проверки отправим PDF с окончательным составом и точной стоимостью заказа.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section className={styles.visitSection} aria-labelledby="visit-title">
        <div className={`${styles.shell} ${styles.visitGrid}`}>
          <div className={styles.visitCopy}>
            <h2 id="visit-title">Можно приехать и рассчитать дымоход в офисе</h2>
            <p>
              Производство и офис находятся в Санкт-Петербурге рядом с метро «Площадь Александра
              Невского»: ул. 2-й Луч, 4, корп. 2. Возьмите с собой размеры, фотографии или схему —
              специалист поможет уточнить комплект.
            </p>
            <div className={styles.visitFacts}>
              <p><MapPin aria-hidden size={20} /> Санкт-Петербург, ул. 2-й Луч, 4, корп. 2</p>
              <p><TruckDelivery aria-hidden size={20} /> Доставляем готовые заказы по всей России</p>
              <p><Clock aria-hidden size={20} /> Время посещения лучше согласовать заранее</p>
            </div>
            <div className={styles.visitActions}>
              <a
                href="https://yandex.ru/maps/?text=%D0%A1%D0%B0%D0%BD%D0%BA%D1%82-%D0%9F%D0%B5%D1%82%D0%B5%D1%80%D0%B1%D1%83%D1%80%D0%B3%2C%20%D1%83%D0%BB.%202-%D0%B9%20%D0%9B%D1%83%D1%87%2C%204%2C%20%D0%BA%D0%BE%D1%80%D0%BF.%202"
                rel="noopener noreferrer"
                target="_blank"
              >
                Построить маршрут <ArrowRight aria-hidden size={17} />
              </a>
              <a href="tel:+79650756555"><Phone aria-hidden size={17} /> Позвонить</a>
            </div>
          </div>

          <div className={styles.mapFrame}>
            <iframe
              allowFullScreen
              loading="lazy"
              src="https://yandex.ru/map-widget/v1/?z=16&text=%D0%A1%D0%B0%D0%BD%D0%BA%D1%82-%D0%9F%D0%B5%D1%82%D0%B5%D1%80%D0%B1%D1%83%D1%80%D0%B3%2C%20%D1%83%D0%BB.%202-%D0%B9%20%D0%9B%D1%83%D1%87%2C%204%2C%20%D0%BA%D0%BE%D1%80%D0%BF.%202"
              title="Дымоход Трейд на Яндекс Картах"
            />
          </div>
        </div>
      </section>

      <section className={styles.closingSection} aria-labelledby="closing-title">
        <div className={`${styles.shell} ${styles.closingGrid}`}>
          <div>
            <h2 id="closing-title">Начните с того, что уже знаете</h2>
            <p>
              Быстрый расчёт даст предварительный состав, а менеджер поможет проверить детали и
              подготовит окончательную смету в PDF.
            </p>
          </div>
          <div className={styles.closingActions}>
            <Link href="/bystryy-raschet#quick-estimate">
              Рассчитать комплект <ArrowRight aria-hidden size={18} />
            </Link>
            <a href="mailto:office@dimohod-trade.pro">
              <FilePdf aria-hidden size={18} /> office@dimohod-trade.pro
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
