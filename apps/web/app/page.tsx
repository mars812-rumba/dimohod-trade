import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense, type CSSProperties } from "react";
import {
  ArrowRight,
  Boxes,
  Check,
  ChevronRight,
  FileCheck2,
  FlameKindling,
  Gauge,
  Home,
  LayoutGrid,
  Link2,
  ListChecks,
  Mail,
  MapPin,
  MessageCircleQuestion,
  Phone,
  ReceiptText,
  Ruler,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Timer,
  Wrench,
  Zap,
} from "lucide-react";
import { ChimneyConfigurator } from "../components/ChimneyConfigurator";
import { LeadForm } from "../components/LeadForm";
import { YANDEX_MAPS_RATING } from "../components/YandexRatingBadge";
import {
  cookiePolicyPath,
  personalDataConsentPath,
  privacyPolicyPath,
  userAgreementPath,
} from "@/lib/privacy";
import { productSelectionPath } from "@/lib/productUrls";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Дымоход Трейд — подбор комплекта дымохода",
  description:
    "Подготовьте черновой комплект дымохода для бани, печи, камина или котла. Уточним маршрут, исходные данные и позиции для проверки.",
};

const scenarios = [
  {
    icon: FlameKindling,
    slug: "banya",
    title: "Баня и сауна",
    text: "Модель банной печи, параметры патрубка и маршрут через конструкции объекта.",
    image: "/images/home/scenario-banya.webp",
    href: "/solutions/banya",
  },
  {
    icon: Home,
    slug: "dom",
    title: "Частный дом",
    text: "Выберите печь, камин или котёл и перейдите к подходящему сценарию.",
    image: "/images/home/hero-photo-720.webp",
    href: "/solutions/dom",
  },
  {
    icon: FlameKindling,
    slug: "pech",
    title: "Отопительная печь",
    text: "Паспорт отопителя, точка подключения и маршрут через помещения дома.",
    image: "/images/home/scenario-kamin.webp",
    href: "/solutions/pech",
  },
  {
    icon: Home,
    slug: "kamin",
    title: "Камин",
    text: "Модель топки, место подключения, новая трасса или существующий канал.",
    image: "/images/home/scenario-kamin.webp",
    href: "/solutions/kamin",
  },
  {
    icon: Zap,
    slug: "tt-kotel",
    title: "Твердотопливный котёл",
    text: "Точная модель котла, параметры патрубка и полный маршрут котельной.",
    image: "/images/home/scenario-tt-kotel.webp",
    href: "/solutions/tverdotoplivny-kotel",
  },
  {
    icon: Gauge,
    slug: "gaz",
    title: "Газовый котёл",
    text: "Документация модели и разрешённая производителем конфигурация системы.",
    image: "/images/home/scenario-gaz.webp",
    href: "/solutions/gazovyy-kotel",
  },
];

const faq = [
  ["Можно ли заказать комплект только по фото?", "Фото помогает начать подбор, но обычно нужны модель печи, диаметр патрубка, высота и места прохода через конструкции. Если данных не хватит, инженер перечислит, что уточнить."],
  ["Конфигуратор сразу показывает окончательный комплект?", "Нет. Это бета-версия для черновой схемы. Перед заказом специалист проверяет диаметр, сталь, узлы прохода и конкретные позиции."],
  ["Почему в черновой смете нет цены?", "Сначала нужно подтвердить совместимость и исполнение деталей. После проверки состав можно связать с конкретными SKU и актуальными ценами."],
  ["Можно прислать готовый план или свою смету?", "Да. Прикрепите PDF или изображение к форме — мы сверим маршрут и отметим недостающие данные."],
];

const yandexReviews = [
  {
    author: "Иван Семёнович Крузенштерн",
    date: "4 июля",
    rating: 5,
    summary:
      "Отметил качество материалов, точную стыковку деталей, выбор исполнения и возможность заказать монтаж.",
  },
  {
    author: "Алексей Чуб",
    date: "28 февраля 2025",
    rating: 5,
    summary:
      "Положительно оценил скорость, качество, рыночные цены и профессиональную работу замерщика.",
  },
  {
    author: "Артем Богданов",
    date: "31 марта 2025",
    rating: 5,
    summary:
      "Заказывает здесь с 2018 года; отметил нестандартное изготовление, выбор AISI 304 для наружного контура и цены.",
  },
  {
    author: "Евгений М.",
    date: "6 июня",
    rating: 5,
    summary:
      "Приехал без предварительной записи, получил консультацию, а заказ изготовили примерно за полчаса.",
  },
  {
    author: "Глеб Борисыч",
    date: "7 марта 2025",
    rating: 5,
    summary:
      "Давно сотрудничает с компанией; положительно оценил качество, сроки выполнения и ответственность.",
  },
];

const route = [
  { number: "01", title: "Источник", text: "Печь или котёл" },
  { number: "02", title: "Тёплая зона", text: "Стартовый участок" },
  { number: "03", title: "Проход", text: "Стена или кровля" },
  { number: "04", title: "Наружный участок", text: "Проверка исполнения" },
  { number: "05", title: "Оголовок", text: "Завершение системы" },
];

const checks = [
  "Диаметр патрубка и всех элементов",
  "Контур для тёплой и холодной зоны",
  "Марка и толщина стали",
  "Проход через стену или перекрытие",
  "Ревизия, конденсатоотвод и крепёж",
  "Оголовок и завершение системы",
];

const catalogGroups = [
  {
    title: "Одноконтурные элементы",
    text: "Подключение к печи и участки внутри тёплого помещения.",
    tags: ["Трубы", "Отводы", "Тройники", "Шиберы"],
  },
  {
    title: "Сэндвич-система",
    text: "Утеплённый контур для улицы, чердака и других холодных зон.",
    tags: ["Утепление 50 мм", "Хомуты", "Оголовки"],
  },
  {
    title: "Монтаж и проходы",
    text: "Узлы, которые связывают комплект с конструкциями конкретного объекта.",
    tags: ["ППУ", "Кронштейны", "Разделки"],
  },
];

const featuredProductCard = {
  name: "Сэндвич-труба Ø150/250",
  variant: "L=1000 мм · AISI 304 · 0,8 мм · изоляция 50 мм",
  image: "/media/catalog/categories/sendvich-truba-truba/photo-1.webp",
  href: productSelectionPath(
    "sendvich-truba",
    { diameter_mm: 150, outer_diameter_mm: 250 },
    "d150-250-l1000-aisi304-t080-ins50",
  ),
  specs: [
    ["Внутренний диаметр", "150 мм"],
    ["Наружный диаметр", "250 мм"],
    ["Длина", "1000 мм"],
  ],
  compatible: [
    "Тройник с К/О 90° Ø150/250",
    "Отвод 45° Ø150/250",
    "Хомут широкий Ø150",
  ],
  installation: [
    "Для крепления используются клёпки и фирменные хомуты.",
    "Соединения элементов нельзя размещать внутри стен и перекрытий.",
  ],
};

const basePath = process.env.NEXT_BASE_PATH ?? "";
const assetUrl = (path: string) => `${basePath}${path}`;

export default function HomePage() {
  const heroStyle = {
    "--hero-image": `url("${assetUrl("/images/home/hero-house-chimney-v1-720.webp")}")`,
    "--hero-image-mobile": `url("${assetUrl("/images/home/hero-house-chimney-v1-480.webp")}")`,
  } as CSSProperties;

  return (
    <>
      <link
        rel="preload"
        as="image"
        href={assetUrl("/images/home/hero-house-chimney-v1-480.webp")}
        media="(max-width: 720px)"
        type="image/webp"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href={assetUrl("/images/home/hero-house-chimney-v1-720.webp")}
        media="(min-width: 721px)"
        type="image/webp"
        fetchPriority="high"
      />
      <main className={styles.main}>
      <section className={styles.hero} style={heroStyle}>
        <div className={styles.shell}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.kicker}>
                <span />
                Санкт-Петербург · доставка по России
              </p>
              <h1>
                Дымоход, который <span>точно подойдет</span>
              </h1>
              <p className={styles.heroLead}>
                Подберём комплект по вашей трассе и параметрам отопителя.
              </p>
              <dl className={styles.proof}>
                <div>
                  <dt>
                    <Timer size={20} strokeWidth={1.65} aria-hidden />
                    <span>≈ 2 минуты</span>
                  </dt>
                  <dd>на пошаговый подбор совместимого комплекта</dd>
                </div>
                <div>
                  <dt>
                    <ReceiptText size={20} strokeWidth={1.65} aria-hidden />
                    <span>Состав на экране</span>
                  </dt>
                  <dd>увидите элементы и их количество в одной смете</dd>
                </div>
                <div>
                  <dt>
                    <MessageCircleQuestion size={20} strokeWidth={1.65} aria-hidden />
                    <span>Помощь специалиста</span>
                  </dt>
                  <dd>менеджер подключится к сложным вопросам</dd>
                </div>
              </dl>
              <div className={styles.heroActions}>
                <a className={styles.primaryButton} href="#calculator">
                  <SlidersHorizontal size={18} strokeWidth={1.7} aria-hidden />
                  Подобрать за 2 минуты
                </a>
                <Link className={styles.secondaryButton} href="/catalog">
                  <LayoutGrid size={17} strokeWidth={1.7} aria-hidden />
                  Открыть каталог
                </Link>
              </div>
            </div>

            <div className={styles.heroSystem}>
              <div className={styles.systemRule}>
                <ShieldCheck size={22} aria-hidden />
                <div>
                  <span>Результат конфигуратора</span>
                  <strong>Черновой комплект можно проверить и уточнить перед заказом</strong>
                </div>
              </div>
            </div>
          </div>

          <ol className={styles.route} aria-label="Маршрут дымоходной системы">
            {route.map((step) => (
              <li key={step.number}>
                <span>{step.number}</span>
                <div>
                  <strong>{step.title}</strong>
                  <small>{step.text}</small>
                </div>
                <ChevronRight size={17} aria-hidden />
              </li>
            ))}
          </ol>
          <p className={styles.routePromise}>
            <ShieldCheck size={17} aria-hidden />
            Конфигуратор связывает шаги в черновую схему, а недостающие данные сохраняет для
            проверки специалистом.
          </p>
        </div>
      </section>

      <section className={styles.differenceSection} aria-labelledby="difference-title">
        <div className={styles.shell}>
          <div className={styles.differenceIntro}>
            <div>
              <p className={styles.overline}>Не просто трубы</p>
              <h2 id="difference-title">
                Трубу купить легко. Сложнее собрать правильный дымоход.
              </h2>
            </div>
            <p>
              Укажите параметры отопителя и трассы — конфигуратор сформирует черновой комплект
              целиком: элементы и их количество.
            </p>
          </div>

          <div className={styles.differenceFlow}>
            <article className={styles.differenceScenario}>
              <span className={styles.differenceIcon} aria-hidden>
                <Boxes size={23} strokeWidth={1.65} />
              </span>
              <div>
                <span className={styles.differenceLabel}>Самостоятельный подбор</span>
                <h3>Покупать по отдельности</h3>
                <p>
                  Трубы, переходники, тройники и крепёж нужно самостоятельно сверять по диаметру,
                  типу и связям между элементами.
                </p>
              </div>
            </article>

            <div className={styles.differenceDirection} aria-hidden>
              <ArrowRight size={25} strokeWidth={1.7} />
            </div>

            <article className={`${styles.differenceScenario} ${styles.differenceScenarioResolved}`}>
              <span className={styles.differenceIcon} aria-hidden>
                <ListChecks size={23} strokeWidth={1.65} />
              </span>
              <div>
                <span className={styles.differenceLabel}>Подбор по параметрам</span>
                <h3>Собрать комплект</h3>
                <p>
                  Вы задаёте параметры отопителя и трассы. Конфигуратор показывает черновой состав
                  системы и количество элементов на одном экране.
                </p>
              </div>
            </article>

            <div className={styles.differenceFooter}>
              <p>Вы описываете задачу — мы помогаем собрать систему.</p>
              <a className={styles.primaryButton} href="#calculator">
                Собрать комплект <ArrowRight size={17} aria-hidden />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.productGuidanceSection} aria-labelledby="product-guidance-title">
        <div className={styles.shell}>
          <div className={styles.productGuidanceIntro}>
            <div>
              <p className={styles.overline}>Больше, чем каталог</p>
              <h2 id="product-guidance-title">
                Выбрали деталь — покажем, что к ней подходит и как её установить.
              </h2>
            </div>
            <p>
              В карточке изделия — характеристики, совместимые элементы и рекомендации по
              монтажу. Нужная информация собрана в одном месте.
            </p>
          </div>

          <div className={styles.productCardPreview}>
            <article className={styles.productCardSummary}>
              <div className={styles.productCardImage}>
                <Image
                  src={assetUrl(featuredProductCard.image)}
                  alt="Сэндвич-труба Ø150/250"
                  fill
                  loading="lazy"
                  quality={72}
                  unoptimized
                  sizes="(max-width: 720px) calc(100vw - 70px), 300px"
                />
              </div>
              <div className={styles.productCardSummaryBody}>
                <span className={styles.productCardEyebrow}>Фрагмент карточки товара</span>
                <h3>{featuredProductCard.name}</h3>
                <p>{featuredProductCard.variant}</p>
                <dl className={styles.productCardSpecs}>
                  {featuredProductCard.specs.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </article>

            <div className={styles.productCardDetails}>
              <section className={styles.productCardDetail}>
                <div className={styles.productCardDetailHeading}>
                  <span aria-hidden><Link2 size={19} strokeWidth={1.8} /></span>
                  <div>
                    <small>Следующий шаг</small>
                    <h3>Совместимые элементы</h3>
                  </div>
                </div>
                <ul className={styles.productCardList}>
                  {featuredProductCard.compatible.map((item) => (
                    <li key={item}>
                      <Check size={15} aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className={`${styles.productCardDetail} ${styles.productCardInstallation}`}>
                <div className={styles.productCardDetailHeading}>
                  <span aria-hidden><Wrench size={19} strokeWidth={1.8} /></span>
                  <div>
                    <small>По данным карточки</small>
                    <h3>Рекомендации по монтажу</h3>
                  </div>
                </div>
                <ul className={styles.productCardList}>
                  {featuredProductCard.installation.map((item) => (
                    <li key={item}>
                      <ChevronRight size={15} aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className={styles.productCardCaution}>
                  Рекомендации помогают разобраться в применении изделия, но не заменяют проект и
                  проверку специалиста.
                </p>
              </section>
            </div>

            <div className={styles.productGuidanceFooter}>
              <p>От выбора детали до её места в системе.</p>
              <div>
                <Link className={styles.productPreviewLink} href={featuredProductCard.href}>
                  Посмотреть эту карточку <ArrowRight size={16} aria-hidden />
                </Link>
                <Link className={styles.primaryButton} href="/catalog">
                  Открыть каталог <ArrowRight size={17} aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.scenarioSection}>
        <div className={styles.shell}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.overline}>Начните с источника тепла</p>
              <h2>У каждого дома — свой маршрут.</h2>
            </div>
            <p>
              Не нужно знать названия всех деталей. Выберите задачу, а мы покажем, какие данные
              понадобятся для проверяемого подбора.
            </p>
          </div>

          <div className={styles.scenarioGrid}>
            {scenarios.map((scenario) => {
              const Icon = scenario.icon;
              return (
                <Link
                  key={scenario.slug}
                  className={styles.scenarioCard}
                  href={scenario.href}
                >
                  <span className={styles.scenarioImage}>
                    <Image
                      src={assetUrl(scenario.image)}
                      alt=""
                      fill
                      loading="lazy"
                      quality={72}
                      sizes="(max-width: 720px) calc(100vw - 28px), (max-width: 1020px) 50vw, 33vw"
                    />
                    <span className={styles.scenarioIcon}>
                      <Icon size={20} />
                    </span>
                  </span>
                  <span className={styles.scenarioBody}>
                    <strong>{scenario.title}</strong>
                    <small>{scenario.text}</small>
                    <span>
                      Открыть сценарий <ArrowRight size={15} aria-hidden />
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.calculatorSection} id="calculator">
        <div className={styles.shell}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.overline}>Черновик комплекта</p>
              <h2>Покажите трассу — увидите состав системы.</h2>
            </div>
            <p>
              Выберите направление выхода, этажность и высоту. Схема и список элементов
              перестроятся сразу; перед заказом результат проверит специалист.
            </p>
          </div>
          <Suspense
            fallback={(
              <div className={styles.configuratorFallback} role="status">
                Загружаем конфигуратор…
              </div>
            )}
          >
            <ChimneyConfigurator assetBasePath={basePath} />
          </Suspense>
        </div>
      </section>

      <section className={styles.safetySection}>
        <div className={styles.shell}>
          <div className={styles.safetyGrid}>
            <div className={styles.safetyIntro}>
              <p className={styles.overline}>Проверка до заказа</p>
              <h2>Цена ошибки выше стоимости одной детали.</h2>
              <p>
                Поэтому мы не подставляем «типовой» диаметр и не обещаем автоматический ответ
                там, где нужны паспорт оборудования или проверка монтажника.
              </p>
              <a href="tel:+79650756555" className={styles.textLink}>
                Обсудить трассу с инженером <ArrowRight size={16} />
              </a>
            </div>
            <ul className={styles.checkList}>
              {checks.map((check) => (
                <li key={check}>
                  <Check size={17} />
                  <span>{check}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={styles.catalogSection}>
        <div className={styles.shell}>
          <div className={styles.catalogHead}>
            <div>
              <p className={styles.overline}>Каталог для тех, кто знает деталь</p>
              <h2>Ищите по назначению, а выбирайте по характеристикам.</h2>
            </div>
            <Link href="/catalog" className={styles.secondaryButton}>
              Весь каталог <ArrowRight size={17} />
            </Link>
          </div>
          <div className={styles.catalogGrid}>
            {catalogGroups.map((group, index) => (
              <article key={group.title} className={styles.catalogCard}>
                <span className={styles.catalogNumber}>0{index + 1}</span>
                <h3>{group.title}</h3>
                <p>{group.text}</p>
                <div className={styles.tags}>
                  {group.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.trustSection}>
        <div className={styles.shell}>
          <div className={styles.sectionHeading}>
            <div><p className={styles.overline}>Документы и ответственность</p><h2>Проверяем комплект до оплаты.</h2></div>
            <p>Не обещаем совместимость без исходных данных. Для выбранных позиций инженер уточнит доступные паспорта, документы и условия гарантии производителя.</p>
          </div>
          <div className={styles.trustGrid}>
            <article><FileCheck2 size={24} /><strong>Документы на изделия</strong><span>Уточняем доступный комплект документов для конкретных выбранных позиций.</span></article>
            <article><ShieldCheck size={24} /><strong>Гарантия без общих обещаний</strong><span>Условия зависят от производителя и позиции — фиксируем их в предложении.</span></article>
            <article><Wrench size={24} /><strong>Инженерная проверка</strong><span>Черновой расчёт не становится заказом, пока специалист не проверит исходные данные.</span></article>
          </div>
          <div className={styles.companyLine}><MapPin size={16} /><span>Санкт-Петербург, ул. 2-й Луч, 4, корп. 2</span><FileCheck2 size={16} /><span>ООО «Дымоходы-трейд плюс» · ОГРН 1177847018216</span></div>
        </div>
      </section>

      <section className={styles.reviewsSection} aria-labelledby="reviews-title">
        <div className={styles.shell}>
          <div className={styles.reviewsLayout}>
            <div className={styles.reviewsIntro}>
              <div className={styles.reviewsMark}>
                <Image
                  src="/images/home/yandex-maps-icon-user-v6.png"
                  alt="Яндекс Карты"
                  width={1280}
                  height={1280}
                />
              </div>
              <h2 id="reviews-title">Что пишут наши клиенты.</h2>
              <p>
                Кратко пересказали опубликованные отзывы из карточки «Дымоход-Трейд».
                Оригиналы и актуальный рейтинг доступны на Яндекс Картах.
              </p>
              <div
                className={styles.reviewsRating}
                aria-label={`Рейтинг ${YANDEX_MAPS_RATING} из 5`}
              >
                <strong>{YANDEX_MAPS_RATING}</strong>
                <div>
                  <span className={styles.reviewsStars} aria-hidden>
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star key={index} size={17} fill="currentColor" />
                    ))}
                  </span>
                  <small>47 отзывов · 89 оценок · данные на 12.08.2026</small>
                </div>
              </div>
              <a
                className={styles.reviewsLink}
                href="https://yandex.ru/maps/org/dymokhod_treyd/1368513691/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Все отзывы на Яндекс Картах <ArrowRight size={17} aria-hidden />
              </a>
            </div>

            <div className={styles.reviewsWidget}>
              <div
                className={styles.reviewsCarousel}
                role="region"
                aria-label="Отзывы клиентов. Прокручивайте горизонтально"
                tabIndex={0}
              >
                <div className={styles.reviewsTrack}>
                  {yandexReviews.map((review) => (
                    <article className={styles.reviewCard} key={`${review.author}-${review.date}`}>
                      <div className={styles.reviewHeader}>
                        <span className={styles.reviewAvatar} aria-hidden>
                          {review.author.slice(0, 1)}
                        </span>
                        <div>
                          <strong>{review.author}</strong>
                          <span>{review.date}</span>
                        </div>
                      </div>
                      <div
                        className={styles.reviewStars}
                        aria-label={`Оценка ${review.rating} из 5`}
                      >
                        {Array.from({ length: 5 }, (_, index) => (
                          <Star
                            key={index}
                            size={18}
                            fill={index < review.rating ? "currentColor" : "none"}
                          />
                        ))}
                      </div>
                      <p>{review.summary}</p>
                      <a
                        href="https://yandex.ru/maps/org/dymokhod_treyd/1368513691/reviews/"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Оригинал на Яндекс Картах <ArrowRight size={15} aria-hidden />
                      </a>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.faqSection}>
        <div className={styles.shell}>
          <div className={styles.sectionHeading}><div><p className={styles.overline}>Коротко о подборе</p><h2>Частые вопросы.</h2></div><p>Ответы о черновом расчёте, материалах и проверке комплекта.</p></div>
          <div className={styles.faqList}>{faq.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
        </div>
      </section>

      <section className={styles.contactSection}>
        <div className={styles.shell}>
          <div className={styles.contactCard} id="send-materials">
            <div className={styles.contactMark}>
              <Ruler size={30} />
              <Wrench size={28} />
            </div>
            <div>
              <p className={styles.overline}>Есть фото печи или схема дома?</p>
              <h2>Пришлите материалы — соберём спецификацию.</h2>
              <p>
                Укажите модель печи, диаметр патрубка и примерную трассу. Если данных не хватит,
                скажем, что именно нужно уточнить.
              </p>
            </div>
            <LeadForm source="homepage-materials" compact />
            <div className={styles.contactAlternatives}><a href="tel:+79650756555"><Phone size={16} /> +7 (965) 075-65-55</a><a href="mailto:office@dimohod-trade.pro"><Mail size={16} /> office@dimohod-trade.pro</a></div>
          </div>
        </div>
      </section>

      <section className={styles.mapSection} aria-labelledby="map-title">
        <div className={styles.shell}>
          <div className={styles.mapPanel}>
            <div className={styles.mapHeading}>
              <div>
                <h2 id="map-title">Дымоход-Трейд на карте.</h2>
                <p>Санкт-Петербург, ул. 2-й Луч, 4, корп. 2 · этаж 1</p>
              </div>
              <a
                href="https://yandex.ru/maps/org/dymokhod_treyd/1368513691/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Открыть в Яндекс Картах <ArrowRight size={17} aria-hidden />
              </a>
            </div>
            <div className={styles.mapFrame}>
              <iframe
                src="https://yandex.ru/map-widget/v1/?z=16&ol=biz&oid=1368513691"
                title="Дымоход-Трейд на Яндекс Картах"
                loading="lazy"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.shell}>
          <div className={styles.footerGrid}>
            <div className={styles.footerBrand}>
              <Link href="/" aria-label="Дымоход Трейд — главная">
                <img
                  alt="Дымоход Трейд"
                  height="82"
                  src={assetUrl("/brand/logo-original.jpg")}
                  width="180"
                />
              </Link>
              <p>Подбор, комплектация и поставка дымоходных систем.</p>
            </div>
            <nav className={styles.footerLinks} aria-label="Разделы сайта">
              <strong>Разделы сайта</strong>
              <Link href="/catalog">Каталог</Link>
              <Link href="/solutions">Решения</Link>
              <a href="#calculator">Конфигуратор</a>
              <a href="tel:+79650756555">Контакты</a>
            </nav>
            <nav className={styles.footerLinks} aria-label="Правовые документы">
              <strong>Документы</strong>
              <Link href={privacyPolicyPath}>Политика персональных данных</Link>
              <Link href={personalDataConsentPath}>Согласие на обработку данных</Link>
              <Link href={cookiePolicyPath}>Cookie и локальные технологии</Link>
              <Link href={userAgreementPath}>Пользовательское соглашение</Link>
            </nav>
            <div className={styles.footerContacts}>
              <strong>Контакты</strong>
              <div className={styles.address}>
                <MapPin aria-hidden size={15} />
                <span>Санкт-Петербург, ул. 2-й Луч, 4, корп. 2</span>
              </div>
              <div className={styles.legal}>
                <FileCheck2 aria-hidden size={15} />
                <span>ООО «Дымоходы-трейд плюс» · ИНН 7811635572 · ОГРН 1177847018216</span>
              </div>
            </div>
          </div>
          <div className={styles.footerBottom}>© 2026 Дымоход Трейд</div>
        </div>
      </footer>
      </main>
    </>
  );
}
