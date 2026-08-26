import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import {
  IconArrowRight as ArrowRight,
  IconBoxMultiple as Boxes,
  IconCheck as Check,
  IconChevronRight as ChevronRight,
  IconCircleDot as CircleDot,
  IconCertificate as Certificate,
  IconClipboardCheck as ClipboardCheck,
  IconDownload as Download,
  IconFileCheck as FileCheck2,
  IconFlame as FlameKindling,
  IconGauge as Gauge,
  IconHome as Home,
  IconStack3 as Layers3,
  IconLink as Link2,
  IconListCheck as ListChecks,
  IconMail as Mail,
  IconMapPin as MapPin,
  IconPhone as Phone,
  IconRuler as Ruler,
  IconSettings as Cog,
  IconShieldCheck as ShieldCheck,
  IconStar as Star,
  IconTool as Wrench,
  IconTruckDelivery as TruckDelivery,
  IconBolt as Zap,
} from "@tabler/icons-react";
import { CompatibleProductsCarousel } from "../components/CompatibleProductsCarousel";
import { HomeHeroCarousel } from "../components/HomeHeroCarousel";
import { HomeGuidedShowcase } from "../components/HomeGuidedShowcase";
import { LeadForm } from "../components/LeadForm";
import { ProductGalleryPreview } from "../components/ProductGalleryPreview";
import { YANDEX_MAPS_RATING } from "../components/YandexRatingBadge";
import {
  getCompatibleProducts,
  getProductPreview,
  type CompatibleProduct,
} from "@/lib/api";
import { homeDocuments } from "@/lib/homeDocuments";
import {
  cookiePolicyPath,
  personalDataConsentPath,
  privacyPolicyPath,
  userAgreementPath,
} from "@/lib/privacy";
import { productSelectionPath } from "@/lib/productUrls";
import { steelSelectionBadges } from "@/lib/steelSelection";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Дымоход Трейд — подбор комплекта дымохода",
  description:
    "Соберите в конфигураторе комплект дымохода для бани, печи, камина или котла. Уточним маршрут, исходные данные и позиции перед заказом.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "/",
    title: "Дымоход Трейд — подбор комплекта дымохода",
    description: "Подбор дымохода по отопителю и маршруту: схема, состав комплекта и предварительная смета.",
    images: [{
      url: "/images/home/hero-projects/log-house-facade.webp",
      width: 1600,
      height: 900,
      alt: "Концептуальная визуализация наружного маршрута дымохода",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Дымоход Трейд — подбор комплекта дымохода",
    description: "Подбор дымохода по отопителю и маршруту: схема, состав комплекта и предварительная смета.",
    images: ["/images/home/hero-projects/log-house-facade.webp"],
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://dimohod-trade.pro/#organization",
      name: "Дымоход Трейд",
      legalName: "ООО «Дымоходы-трейд плюс»",
      url: "https://dimohod-trade.pro/",
      logo: "https://dimohod-trade.pro/brand/logo-original.jpg",
      telephone: "+7 965 075-65-55",
      email: "office@dimohod-trade.pro",
      address: {
        "@type": "PostalAddress",
        streetAddress: "ул. 2-й Луч, 4, корп. 2",
        addressLocality: "Санкт-Петербург",
        addressCountry: "RU",
      },
      sameAs: ["https://yandex.ru/maps/org/dymokhod_treyd/1368513691/"],
    },
    {
      "@type": "WebSite",
      "@id": "https://dimohod-trade.pro/#website",
      url: "https://dimohod-trade.pro/",
      name: "Дымоход Трейд",
      inLanguage: "ru-RU",
      publisher: { "@id": "https://dimohod-trade.pro/#organization" },
    },
  ],
};

const scenarios = [
  {
    icon: FlameKindling,
    slug: "banya",
    title: "Баня и сауна",
    text: "Модель банной печи, параметры патрубка и маршрут через конструкции объекта.",
    image: "/images/home/scenario-banya-winter-user.webp",
    href: "/solutions/banya",
  },
  {
    icon: Home,
    slug: "dom",
    title: "Частный дом",
    text: "Выберите печь, камин или котёл и перейдите к подходящему сценарию.",
    image: "/images/home/scenario-dom-dark-user.webp",
    href: "/solutions/dom",
  },
  {
    icon: FlameKindling,
    slug: "pech",
    title: "Отопительная печь",
    text: "Паспорт отопителя, точка подключения и маршрут через помещения дома.",
    image: "/images/home/scenario-pech-user.webp",
    href: "/solutions/pech",
  },
  {
    icon: Home,
    slug: "kamin",
    title: "Камин",
    text: "Модель топки, место подключения, новая трасса или существующий канал.",
    image: "/images/home/scenario-kamin-user.webp",
    href: "/solutions/kamin",
  },
  {
    icon: Zap,
    slug: "tt-kotel",
    title: "Твердотопливный котёл",
    text: "Точная модель котла, параметры патрубка и полный маршрут котельной.",
    image: "/images/home/scenario-tt-kotel-user.webp",
    href: "/solutions/tverdotoplivny-kotel",
  },
  {
    icon: Gauge,
    slug: "gaz",
    title: "Газовый котёл",
    text: "Документация модели и разрешённая производителем конфигурация системы.",
    image: "/images/home/scenario-gaz-user.webp",
    href: "/solutions/gazovyy-kotel",
  },
];

const routeExamples = [
  {
    title: "Наружный маршрут через стену",
    text: "Подготовьте размеры подключения, стены и наружного участка — они лягут в основу схемы и предварительного состава.",
    image: "/images/home/hero-projects/log-house-facade.webp",
    href: "/solutions/banya",
  },
  {
    title: "Вертикальный маршрут через кровлю",
    text: "Сценарий помогает последовательно собрать исходные данные по помещениям, перекрытиям и кровле.",
    image: "/images/home/hero-projects/roof-chimney.webp",
    href: "/solutions/dom",
  },
  {
    title: "Подключение отопительного котла",
    text: "Начните с точной модели оборудования и параметров патрубка, затем опишите маршрут дымохода.",
    image: "/images/home/hero-projects/boiler-room.webp",
    href: "/solutions/tverdotoplivny-kotel",
  },
];

const faq = [
  ["Можно ли заказать комплект только по фото?", "Фото помогает начать подбор, но обычно нужны модель печи, диаметр патрубка, высота и места прохода через конструкции. Если данных не хватит, инженер перечислит, что уточнить."],
  ["Конфигуратор сразу показывает окончательный комплект?", "Конфигуратор собирает комплект по указанным параметрам. Перед заказом специалист проверяет диаметр, сталь, узлы прохода и конкретные позиции."],
  ["Почему в смете из конфигуратора нет цены?", "Сначала нужно подтвердить совместимость и исполнение деталей. После проверки состав можно связать с конкретными SKU и актуальными ценами."],
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

const checks = [
  "Диаметр патрубка и всех элементов",
  "Контур для тёплой и холодной зоны",
  "Марка и толщина стали",
  "Проход через стену или перекрытие",
  "Ревизия, конденсатоотвод и крепёж",
  "Оголовок и завершение системы",
];

const serviceBenefits = [
  {
    icon: Zap,
    title: "Лазерная сварка в стык",
    text: "Технология изготовления элементов дымохода из нержавеющей стали.",
  },
  {
    icon: ClipboardCheck,
    title: "Инженерное сопровождение",
    text: "Сверяем исходные данные, схему и состав комплекта до оформления заказа.",
  },
  {
    icon: TruckDelivery,
    title: "Доставка по России",
    text: "Отправляем готовые заказы транспортными компаниями в регионы.",
  },
  {
    icon: FlameKindling,
    title: "Под конкретный отопитель",
    text: "Начинаем подбор с модели и параметров патрубка печи, камина или котла.",
  },
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
  connectionTechnology: "Лазерная сварка в стык",
  media: [
    {
      url: "/media/catalog/skus/dt-sw50-01-00-d100-200/sku-photo-1.webp",
      thumbnailUrl: "/media/catalog/skus/dt-sw50-01-00-d100-200/sku-photo-1.thumb.webp",
      alt: "Метровая сэндвич-труба — общий вид",
      role: "general",
    },
    {
      url: "/media/catalog/skus/dt-sw50-01-00-d100-200/sku-photo-2.webp",
      thumbnailUrl: "/media/catalog/skus/dt-sw50-01-00-d100-200/sku-photo-2.thumb.webp",
      alt: "Метровая сэндвич-труба — вид сверху",
      role: "top",
    },
    {
      url: "/media/catalog/skus/dt-sw50-01-00-d100-200/sku-photo-3.webp",
      thumbnailUrl: "/media/catalog/skus/dt-sw50-01-00-d100-200/sku-photo-3.thumb.webp",
      alt: "Метровая сэндвич-труба — соединительный край",
      role: "connection",
    },
  ],
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
  selectionFacts: [
    ["Диаметры", "150 / 250 мм"],
    ["Длина секции", "1000 мм"],
    ["Сталь", "AISI 304 · 0,8 мм"],
    ["Изоляция", "50 мм"],
  ],
  skuReference: "d150-250-l1000-aisi304-t080-ins50",
  installation: [
    {
      title: "В перекрытиях",
      text: "Для расчёта нужны материал и толщина перекрытия, положение прохода и размеры помещений. Состав узла подтверждают после проверки этих данных.",
    },
    {
      title: "В стенах",
      text: "Укажите материал и толщину стены, расстояние от отопителя и точку выхода. Эти данные влияют на схему и состав комплекта.",
    },
    {
      title: "По наружной стене",
      text: "Для предварительной схемы понадобятся высота наружного участка, отступ от фасада и особенности кровли. Крепёж подбирают вместе с остальными позициями трассы.",
    },
  ],
};

const basePath = process.env.NEXT_BASE_PATH ?? "";
const assetUrl = (path: string) => `${basePath}${path}`;

function completeCompatibleProducts(items: CompatibleProduct[]) {
  const seenProducts = new Set<string>();
  return items.filter((item) => {
    const description = item.short_description?.trim() ?? "";
    const isComplete = Boolean(
      item.product_name.trim() &&
      item.product_slug.trim() &&
      item.primary_image?.url &&
      item.price_rub &&
      description.length >= 80,
    );
    if (!isComplete || seenProducts.has(item.product_id)) {
      return false;
    }
    seenProducts.add(item.product_id);
    return true;
  }).slice(0, 4);
}

function compatibleDiameter(item: CompatibleProduct) {
  if (item.diameter_mm !== null && item.outer_diameter_mm !== null) {
    return `Ø${item.diameter_mm}/${item.outer_diameter_mm} мм`;
  }
  const diameter = item.diameter_mm ?? item.outer_diameter_mm;
  return diameter === null ? null : `Ø${diameter} мм`;
}

function compatibleSteel(item: CompatibleProduct) {
  const steel = item.steel_grade ?? item.material;
  if (!steel) {
    return null;
  }
  const thickness = item.wall_thickness_mm
    ? ` · ${Number(item.wall_thickness_mm).toLocaleString("ru-RU")} мм`
    : "";
  return `${steel}${thickness}`;
}

function compatiblePrice(value: string) {
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Number(value))} ₽`;
}

const getCachedHomeProductDemo = unstable_cache(
  async () => {
    const [compatibleProducts, previewProduct] = await Promise.all([
      getCompatibleProducts("sendvich-truba", featuredProductCard.skuReference),
      getProductPreview("sendvich-truba"),
    ]);
    const previewSku = previewProduct?.skus.find(
      (sku) => sku.slug === featuredProductCard.skuReference,
    ) ?? null;

    return {
      compatibleProducts: completeCompatibleProducts(compatibleProducts),
      previewBadges: steelSelectionBadges(previewSku),
    };
  },
  ["home-product-demo-v1"],
  { revalidate: 300, tags: ["home-product-demo"] },
);

export default async function HomePage() {
  const homeProductDemo = await getCachedHomeProductDemo().catch(() => ({
    compatibleProducts: [],
    previewBadges: [],
  }));
  const previewMedia = featuredProductCard.media.map((item) => ({
    url: assetUrl(item.url),
    thumbnail_url: assetUrl(item.thumbnailUrl),
    alt: item.alt,
    role: item.role,
  }));
  const { compatibleProducts, previewBadges } = homeProductDemo;
  return (
    <>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }}
        type="application/ld+json"
      />
      <main className={styles.main}>
        <HomeHeroCarousel assetBasePath={basePath} />

        <section className={styles.benefitsSection} aria-labelledby="home-benefits-title">
          <div className={`${styles.shell} ${styles.benefitsLayout}`}>
            <div className={styles.benefitsIntro}>
              <h2 id="home-benefits-title">Почему выбирают Дымоход Трейд</h2>
              <p>Производство, проверка комплекта и доставка — в одном заказе.</p>
            </div>

            <div className={styles.benefitsGrid}>
              {serviceBenefits.map(({ icon: Icon, title, text }) => (
                <article className={styles.benefitItem} key={title}>
                  <span className={styles.benefitIcon} aria-hidden>
                    <Icon size={29} strokeWidth={1.55} />
                  </span>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <HomeGuidedShowcase assetBasePath={basePath} />

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
              Укажите параметры отопителя и трассы — конфигуратор соберёт комплект целиком:
              покажет элементы и их количество.
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
                  Вы задаёте параметры отопителя и трассы. Конфигуратор показывает собранный состав
                  системы и количество элементов на одном экране.
                </p>
              </div>
            </article>

            <div className={styles.differenceFooter}>
              <p>Вы описываете задачу — мы помогаем собрать систему.</p>
              <Link className={styles.primaryButton} href="/configurator">
                Собрать комплект <ArrowRight size={17} aria-hidden />
              </Link>
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
              <ProductGalleryPreview
                media={previewMedia}
                productName={featuredProductCard.name}
                badges={previewBadges}
                connectionTechnology={featuredProductCard.connectionTechnology}
              />
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

            <section className={`${styles.productCardDetail} ${styles.productCardInstallation}`}>
              <div className={styles.productCardDetailHeading}>
                <span aria-hidden><Wrench size={19} strokeWidth={1.8} /></span>
                <div>
                  <small>По данным карточки</small>
                  <h3>Рекомендации по монтажу</h3>
                </div>
              </div>
              <div className={styles.installationAccordion}>
                {featuredProductCard.installation.map((item, index) => (
                  <details key={item.title} open={index === 0}>
                    <summary>
                      <span className={styles.installationNumber}>0{index + 1}</span>
                      <strong>{item.title}</strong>
                      <ChevronRight size={17} strokeWidth={1.8} aria-hidden />
                    </summary>
                    <p>{item.text}</p>
                  </details>
                ))}
              </div>
              <p className={styles.productCardCaution}>
                Рекомендации помогают разобраться в применении изделия, но не заменяют проект и
                проверку специалиста.
              </p>
              <div className={styles.productCardSelectionFacts}>
                <div className={styles.productCardSelectionHeading}>
                  <small>Выбранный вариант</small>
                  <h4>Параметры для сверки</h4>
                </div>
                <dl>
                  {featuredProductCard.selectionFacts.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                <p>
                  Эти значения понадобятся при проверке соединения с соседними элементами и
                  составлении полной трассы.
                </p>
              </div>
            </section>

            {compatibleProducts.length > 0 ? (
              <section className={`${styles.productCardDetail} ${styles.compatiblePreview}`}>
                <div className={styles.productCardDetailHeading}>
                  <span aria-hidden><Link2 size={19} strokeWidth={1.8} /></span>
                  <div>
                    <small>Сопутствующие товары</small>
                    <h3>Совместимые элементы</h3>
                  </div>
                </div>
                <CompatibleProductsCarousel>
                  {compatibleProducts.map((item) => {
                    const diameter = compatibleDiameter(item);
                    const steel = compatibleSteel(item);
                    return (
                      <article className={styles.compatibleSlide} key={item.product_id}>
                        <div className={styles.compatibleSlideImage}>
                          <Image
                            src={assetUrl(item.primary_image!.thumbnail_url ?? item.primary_image!.url)}
                            alt={item.primary_image!.alt ?? `${item.product_name} — общий вид`}
                            fill
                            loading="lazy"
                            unoptimized
                            sizes="(max-width: 720px) calc(100vw - 70px), (max-width: 1020px) 50vw, 25vw"
                          />
                        </div>
                        <div className={styles.compatibleSlideBody}>
                          <h4>{item.product_name}</h4>
                          <p>{item.short_description}</p>
                          <div className={styles.compatibleSlideSpecs}>
                            {diameter ? <span><CircleDot size={13} aria-hidden />{diameter}</span> : null}
                            {item.insulation_mm !== null ? (
                              <span><Layers3 size={13} aria-hidden />Изоляция {item.insulation_mm} мм</span>
                            ) : null}
                            {steel ? <span><Cog size={13} aria-hidden />{steel}</span> : null}
                          </div>
                          <div className={styles.compatibleSlideFooter}>
                            <strong>{compatiblePrice(item.price_rub!)}</strong>
                            <Link href={productSelectionPath(item.product_slug, item, item.article)}>
                              Открыть <ArrowRight size={14} aria-hidden />
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </CompatibleProductsCarousel>
              </section>
            ) : null}

            <div className={styles.productGuidanceFooter}>
              <p>От выбора детали до её места в системе.</p>
              <div>
                <Link className={styles.productPreviewLink} href={featuredProductCard.href}>
                  Смотреть всё о товаре <ArrowRight size={16} aria-hidden />
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

      <section className={styles.calculatorEntrySection} id="calculator">
        <div className={styles.shell}>
          <div className={styles.calculatorEntry}>
            <div>
              <p className={styles.overline}>Расчёт по вашим замерам</p>
              <h2>Соберите дымоход на отдельном рабочем экране.</h2>
              <p>
                Конфигуратор откроет сохранённые замеры и покажет предварительную SVG-схему,
                состав комплекта, цены доступных позиций и PDF-смету.
              </p>
              <div className={styles.calculatorEntryActions}>
                <Link className={styles.primaryButton} href="/configurator">
                  Открыть конфигуратор <ArrowRight aria-hidden size={17} />
                </Link>
                <Link className={styles.secondaryButton} href="/zamery">
                  <Ruler aria-hidden size={17} /> Мои замеры
                </Link>
              </div>
            </div>
            <ol className={styles.calculatorEntryResults} aria-label="Результат конфигуратора">
              <li><span>01</span><strong>Расчётная SVG-схема</strong></li>
              <li><span>02</span><strong>Комплект из позиций каталога</strong></li>
              <li><span>03</span><strong>PDF и отправка менеджеру</strong></li>
            </ol>
          </div>
        </div>
      </section>

      <section className={styles.routeExamplesSection} aria-labelledby="route-examples-title">
        <div className={styles.shell}>
          <div className={styles.routeExamplesHeading}>
            <div>
              <h2 id="route-examples-title">Три маршрута, с которых удобно начать расчёт.</h2>
              <p>
                Выберите похожую задачу и подготовьте исходные данные. Иллюстрации ниже — временные
                концептуальные рендеры, а не фотографии выполненных объектов.
              </p>
            </div>
            <Link className={styles.secondaryButton} href="/solutions">
              Все сценарии <ArrowRight size={17} aria-hidden />
            </Link>
          </div>
          <div className={styles.routeExamplesGrid}>
            {routeExamples.map((item) => (
              <Link className={styles.routeExample} href={item.href} key={item.title}>
                <span className={styles.routeExampleMedia}>
                  <Image
                    alt={`Концептуальная визуализация: ${item.title.toLocaleLowerCase("ru-RU")}`}
                    fill
                    loading="lazy"
                    quality={76}
                    sizes="(max-width: 720px) calc(100vw - 32px), (max-width: 1020px) 50vw, 33vw"
                    src={assetUrl(item.image)}
                  />
                  <small>Визуализация</small>
                </span>
                <span className={styles.routeExampleBody}>
                  <h3>{item.title}</h3>
                  <span>{item.text}</span>
                  <b>Подготовить расчёт <ArrowRight size={15} aria-hidden /></b>
                </span>
              </Link>
            ))}
          </div>
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
            <div><p className={styles.overline}>Проверка перед заказом</p><h2>Сначала сверяем исходные данные и состав.</h2></div>
            <p>Не обещаем совместимость без параметров отопителя и трассы. Предварительный расчёт становится основанием для проверки специалистом.</p>
          </div>
          <div className={styles.trustGrid}>
            <article><Boxes size={24} /><strong>Конкретные позиции</strong><span>Сверяем выбранные SKU, их параметры и количество в предварительном составе.</span></article>
            <article><ShieldCheck size={24} /><strong>Без неподтверждённых обещаний</strong><span>Не публикуем общие условия, пока они не подтверждены для конкретного заказа.</span></article>
            <article><Wrench size={24} /><strong>Инженерная проверка</strong><span>Собранный в конфигураторе комплект не становится заказом, пока специалист не проверит исходные данные.</span></article>
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

      <section className={styles.documentsSection} aria-labelledby="documents-title">
        <div className={styles.shell}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.overline}>Документы производителя</p>
              <h2 id="documents-title">Сертификаты и документы.</h2>
            </div>
            <p>
              Основной сертификат описывает область выпускаемой продукции. Документы на металл
              относятся к указанным в них партиям и размещены для ознакомления.
            </p>
          </div>
          <div className={styles.documentsGrid}>
            {homeDocuments.map((document) => (
              <article
                className={`${styles.documentCard} ${document.featured ? styles.documentCardFeatured : ""}`}
                key={document.id}
              >
                <a
                  className={styles.documentPreview}
                  href={assetUrl(document.previewUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Открыть документ: ${document.title}`}
                >
                  <Image
                    src={document.previewUrl}
                    alt={`Превью документа «${document.title}»`}
                    width={document.featured ? 800 : 905}
                    height={document.featured ? 1141 : 1280}
                  />
                  {document.featured ? (
                    <span className={styles.documentSeal}>
                      <Certificate size={16} aria-hidden /> Основной сертификат
                    </span>
                  ) : null}
                </a>
                <div className={styles.documentBody}>
                  <span>{document.eyebrow}</span>
                  <h3>{document.title}</h3>
                  <p>{document.description}</p>
                  <div className={styles.documentActions}>
                    <a href={assetUrl(document.previewUrl)} target="_blank" rel="noopener noreferrer">
                      Открыть <ArrowRight size={15} aria-hidden />
                    </a>
                    <a href={assetUrl(document.originalUrl)} download>
                      <Download size={15} aria-hidden /> Скачать оригинал
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.faqSection}>
        <div className={styles.shell}>
          <div className={styles.sectionHeading}><div><p className={styles.overline}>Коротко о подборе</p><h2>Частые вопросы.</h2></div><p>Ответы о комплекте из конфигуратора, материалах и проверке перед заказом.</p></div>
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
              <Link href="/guides">Статьи</Link>
              <Link href="/configurator">Конфигуратор</Link>
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
