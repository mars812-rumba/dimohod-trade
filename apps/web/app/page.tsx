import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  FlameKindling,
  Gauge,
  Home,
  Mail,
  MapPin,
  Phone,
  Ruler,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Video,
  Waves,
  Wrench,
  Zap,
} from "lucide-react";
import { ChimneyConfigurator } from "../components/ChimneyConfigurator";

export const metadata: Metadata = {
  title: "Дымоход Трейд — подбор и каталог дымоходных систем",
  description:
    "Подбор совместимого комплекта дымохода для бани, камина, газового и твердотопливного котла. Каталог, документы, схемы монтажа и заявка инженеру.",
};

const scenarios = [
  {
    icon: FlameKindling,
    slug: "banya",
    title: "Баня и сауна",
    desc: "Высокая температура, влажность, деревянные перекрытия и безопасная проходка.",
    result: "Сэндвич на улице + безопасный узел прохода",
    badge: "частый запрос",
    image: "/images/home/scenario-banya.webp",
  },
  {
    icon: Home,
    slug: "kamin",
    title: "Камин",
    desc: "Эстетика в помещении, стабильная тяга, ревизия и корректное подключение к топке.",
    result: "Система от топки до оголовка",
    badge: null,
    image: "/images/home/scenario-kamin.webp",
  },
  {
    icon: Waves,
    slug: "gaz",
    title: "Газовый котёл",
    desc: "Конденсат, герметичность, кислотостойкая сталь и требования производителя котла.",
    result: "Подбор стали и диаметра без угадывания",
    badge: null,
    image: "/images/home/scenario-gaz.webp",
  },
  {
    icon: Zap,
    slug: "tt-kotel",
    title: "Твердотопливный котёл",
    desc: "Температура, сажа, смолы, толщина стали и устойчивость к перегреву.",
    result: "Комплект под температуру и тягу",
    badge: null,
    image: "/images/home/scenario-tt-kotel.webp",
  },
  {
    icon: Wrench,
    slug: "gilzovanie",
    title: "Гильзование шахты",
    desc: "Восстановление кирпичного канала, ревизии, конденсатоотвод и овальные элементы.",
    result: "План ремонта старого канала",
    badge: null,
    image: "/images/home/scenario-gilzovanie.webp",
  },
];

const researchPrinciples = [
  {
    title: "Продаём систему, а не отдельную трубу",
    text: "Покупатель приходит не за SKU, а за уверенностью: какой диаметр, где нужен сэндвич, какой проходной узел и что обязательно добавить к заказу.",
  },
  {
    title: "Скорость маркетплейса + ответственность инженера",
    text: "Берём быстрые фильтры, наличие и понятную цену, но добавляем проверку совместимости, документы и монтажные ограничения.",
  },
  {
    title: "Два входа: новичок и монтажник",
    text: "Новичок идёт через сценарий и расчёт комплекта. Профессионал сразу открывает каталог, фильтры и артикулы.",
  },
];

const selectorSteps = [
  {
    icon: FlameKindling,
    title: "Источник тепла",
    text: "Печь, камин, газовый или твердотопливный котёл.",
  },
  {
    icon: Ruler,
    title: "Диаметр и маршрут",
    text: "Патрубок, высота, повороты, проход через стену или кровлю.",
  },
  {
    icon: ShieldCheck,
    title: "Безопасность",
    text: "Материал, утепление, температура, наружные участки и узлы прохода.",
  },
  {
    icon: ClipboardCheck,
    title: "Спецификация",
    text: "BOM-комплект, цена, документы и заявка инженеру.",
  },
];

const catalogGroups = [
  {
    title: "Одноконтурные дымоходы",
    desc: "Участки внутри помещения, подключение к печи, стартовые элементы и переходы.",
    tags: ["трубы", "отводы", "тройники", "ревизии"],
  },
  {
    title: "Сэндвич-системы",
    desc: "Улица, холодные зоны, проходы через кровлю и безопасная работа наружного контура.",
    tags: ["утепление 50 мм", "наружный контур", "оголовки", "хомуты"],
  },
  {
    title: "Узлы монтажа",
    desc: "Проходные элементы, крепления, конденсатоотводы, финишные детали и документы.",
    tags: ["ППУ", "кронштейны", "зонты", "сертификаты"],
  },
];

const compatibilityChecks = [
  "Диаметр патрубка и внутреннего канала",
  "Контур: внутри можно одноконтурный, по улице — только сэндвич",
  "Марка стали под топливо, температуру и конденсат",
  "Проход через дерево, стену и кровлю",
  "Совместимость тройников, ревизий, оголовков и крепежа",
  "Документы: сертификаты, инструкции, пожарная безопасность",
];

const productCardBlocks = [
  {
    icon: Camera,
    title: "Фото, чертёж, монтаж",
    text: "Главный вид изделия, размерный чертёж и фото детали в собранной системе.",
  },
  {
    icon: Gauge,
    title: "Характеристики SKU",
    text: "Диаметр, длина, сталь, толщина, утепление, артикул, цена и наличие из базы.",
  },
  {
    icon: CheckCircle2,
    title: "Совместимость",
    text: "Где применять можно, где нельзя, какие соседние элементы нужны рядом.",
  },
  {
    icon: FileText,
    title: "Документы и SEO",
    text: "Паспорта, инструкции, FAQ, Schema.org и отдельный SEO-URL для вариантов.",
  },
];

const knowledgeBlocks = [
  {
    icon: Video,
    title: "Видео монтажа",
    text: "Короткие ролики: как собрать стык, пройти перекрытие, закрепить трубу и поставить ревизию.",
  },
  {
    icon: FileText,
    title: "Сертификаты и инструкции",
    text: "Документы должны быть рядом с карточкой, а не спрятаны в отдельном разделе.",
  },
  {
    icon: Truck,
    title: "Комплектация и доставка",
    text: "Перед отгрузкой проверяем совместимость списка и доставляем комплект по России.",
  },
];

const basePath = process.env.NEXT_BASE_PATH ?? "";
const assetUrl = (path: string) => `${basePath}${path}`;

export default function HomePage() {
  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="page home-hero-grid">
          <div className="home-hero-copy">
            <p className="eyebrow">Дымоходные системы · подбор · каталог · документы</p>
            <h1>
              Подберём дымоход,
              <span> который подходит к вашей печи и монтажу.</span>
            </h1>
            <p className="lead">
              Дымоход Трейд помогает собрать совместимый комплект: от первого метра трубы до
              проходного узла, крепежа, оголовка, документов и заявки инженеру.
            </p>
            <div className="actions">
              <a className="button" href="#calculator">
                Рассчитать комплект <ArrowRight size={17} />
              </a>
              <Link href="/catalog" className="button secondary">
                Открыть каталог <ShoppingBag size={17} />
              </Link>
            </div>
            <div className="hero-metrics" aria-label="Ключевые преимущества">
              <div>
                <strong>6 300+</strong>
                <span>SKU уже в базе</span>
              </div>
              <div>
                <strong>40</strong>
                <span>логических изделий</span>
              </div>
              <div>
                <strong>0</strong>
                <span>угадываний диаметра</span>
              </div>
            </div>
          </div>

          <div className="hero-side">
            <aside className="selector-panel" aria-label="Быстрый подбор дымохода">
              <div className="selector-head">
                <span>Product Finder</span>
                <strong>Начните с задачи — мы соберём детали.</strong>
              </div>
              <div className="selector-list">
                {scenarios.map((scenario) => {
                  const Icon = scenario.icon;
                  return (
                    <Link key={scenario.slug} className="selector-row" href={`/catalog?scenario=${scenario.slug}`}>
                      <span className="scenario-icon-wrap">
                        <Icon size={18} />
                      </span>
                      <span>
                        <strong>{scenario.title}</strong>
                        <small>{scenario.result}</small>
                      </span>
                      {scenario.badge ? <em>{scenario.badge}</em> : null}
                      <ChevronRight size={16} />
                    </Link>
                  );
                })}
              </div>
            </aside>

            <div className="hero-visual" aria-label="Сэндвич дымоход на фасаде деревянного дома">
              <img
                src={assetUrl("/images/home/hero-chimney-system.webp")}
                alt="Сэндвич дымоход из нержавеющей стали на фасаде деревянного дома"
              />
              <div className="hero-visual-caption">
                <strong>Безопасный наружный участок</strong>
                <span>по улице используем только сэндвич-систему</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <div className="page trust-inner">
          <div className="trust-item">
            <ShieldCheck size={20} />
            <div>
              <strong>Проверка совместимости</strong>
              <span>диаметр, сталь, контур, температура, проходы</span>
            </div>
          </div>
          <div className="trust-item">
            <ShoppingBag size={20} />
            <div>
              <strong>Каталог для монтажника</strong>
              <span>артикулы, цены, варианты и фильтры</span>
            </div>
          </div>
          <div className="trust-item">
            <FileText size={20} />
            <div>
              <strong>Документы рядом</strong>
              <span>сертификаты, инструкции, пожарная безопасность</span>
            </div>
          </div>
          <div className="trust-item">
            <Phone size={20} />
            <div>
              <strong>Инженер на связи</strong>
              <span>проверим комплект перед заказом</span>
            </div>
          </div>
        </div>
      </section>

      <section className="page section">
        <div className="section-head">
          <div>
            <p className="eyebrow">UX-вывод исследования</p>
            <h2>Лучший сайт дымоходов должен закрыть страх ошибки.</h2>
          </div>
          <p className="section-lead">
            В исследовании видно: рынок умеет показывать каталоги, но редко объясняет безопасную
            систему целиком. Поэтому главная строится вокруг подбора, доверия и понятного пути в
            комплект.
          </p>
        </div>

        <div className="principle-grid">
          {researchPrinciples.map((principle, index) => (
            <article key={principle.title} className="principle-card">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{principle.title}</h3>
              <p>{principle.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="soft-section">
        <div className="page">
          <div className="section-head">
            <div>
              <p className="eyebrow">Сценарные входы</p>
              <h2>Пять дверей для клиента: от бани до гильзования.</h2>
            </div>
            <p className="section-lead">
              Эти блоки станут SEO-посадочными страницами: “дымоход для бани”, “для камина”,
              “для газового котла”, “через стену”, “для кирпичной шахты”.
            </p>
          </div>

          <div className="scenario-grid">
            {scenarios.map((scenario) => {
              const Icon = scenario.icon;
              return (
                <Link key={scenario.slug} className="scenario-card" href={`/catalog?scenario=${scenario.slug}`}>
                  <span className="scenario-card-image">
                    <img src={assetUrl(scenario.image)} alt={`${scenario.title}: пример дымоходного решения`} />
                  </span>
                  <span className="scenario-card-icon">
                    <Icon size={24} />
                  </span>
                  <h3>{scenario.title}</h3>
                  <p>{scenario.desc}</p>
                  <span className="scenario-card-link">
                    Перейти к подбору <ArrowRight size={14} />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="page section" id="calculator">
        <div className="section-head">
          <div>
            <p className="eyebrow">Конфигуратор комплекта</p>
            <h2>Главный интерактивный продукт — не калькулятор цены, а спецификация.</h2>
          </div>
          <p className="section-lead">
            MVP может начинаться как заявка из четырёх вопросов. Дальше — rule engine, BOM,
            PDF-смета и база совместимости печей/котлов.
          </p>
        </div>

        <div className="selector-flow">
          {selectorSteps.map((step) => {
            const Icon = step.icon;
            return (
              <article key={step.title} className="step-card">
                <span>
                  <Icon size={21} />
                </span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            );
          })}
        </div>

        <ChimneyConfigurator assetBasePath={basePath} />
      </section>

      <section className="page section catalog-split">
        <div>
          <p className="eyebrow">Каталог</p>
          <h2>Быстрый путь для тех, кто уже знает деталь.</h2>
          <p className="section-lead">
            Каталог остаётся техническим: Product → Variant → SKU. Одна карточка изделия,
            множество вариантов по диаметру, длине, стали, толщине и утеплению.
          </p>
          <Link className="button inline-button" href="/catalog">
            Смотреть каталог <ArrowRight size={16} />
          </Link>
        </div>

        <div className="catalog-group-grid">
          {catalogGroups.map((group) => (
            <article key={group.title} className="catalog-group-card">
              <h3>{group.title}</h3>
              <p>{group.desc}</p>
              <div className="tag-row">
                {group.tags.map((tag) => (
                  <span key={tag} className="chip">
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="dark-section">
        <div className="page compatibility-grid">
          <div>
            <p className="eyebrow">Совместимость</p>
            <h2>Что мы проверяем до заявки.</h2>
            <p>
              Наша логика должна быть видна на главной: покупатель понимает, что получает не
              обратный звонок “как у всех”, а проверку технической связки элементов.
            </p>
          </div>

          <ul className="check-list">
            {compatibilityChecks.map((check) => (
              <li key={check}>
                <CheckCircle2 size={18} />
                <span>{check}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="page section product-preview-section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Карточка товара</p>
            <h2>Карточка должна объяснять изделие, вариант и риск применения.</h2>
          </div>
          <p className="section-lead">
            Каждая SEO-важная вариация получает canonical URL, но интерфейс остаётся единым:
            меняются данные, характеристики, документы, цена и совместимость.
          </p>
        </div>

        <div className="product-anatomy">
          <div className="product-mock">
            <div className="product-mock-image">
              <span>Сэндвич-труба 115/200</span>
              <small>фото · чертёж · в системе</small>
            </div>
            <div className="product-mock-specs">
              <span>D 115/200</span>
              <span>AISI 430</span>
              <span>изоляция 50 мм</span>
            </div>
          </div>
          <div className="product-feature-grid">
            {productCardBlocks.map((block) => {
              const Icon = block.icon;
              return (
                <article key={block.title} className="feature-card">
                  <Icon size={20} />
                  <h3>{block.title}</h3>
                  <p>{block.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="soft-section">
        <div className="page">
          <div className="section-head">
            <div>
              <p className="eyebrow">DIY Help + документы</p>
              <h2>Обучение должно вести не в блог, а в правильный комплект.</h2>
            </div>
            <p className="section-lead">
              Лучшие зарубежные сайты совмещают магазин, инструкции, калькуляторы и помощь
              эксперта. Мы делаем так же: знания рядом с товаром и подбором.
            </p>
          </div>

          <div className="knowledge-grid">
            {knowledgeBlocks.map((block) => {
              const Icon = block.icon;
              return (
                <article key={block.title} className="feature-card">
                  <Icon size={22} />
                  <h3>{block.title}</h3>
                  <p>{block.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="lead-section">
        <div className="page lead-card">
          <div>
            <p className="eyebrow">Заявка инженеру</p>
            <h2>Пришлите фото печи или план — соберём безопасный комплект.</h2>
            <p>
              Для MVP этот блок ведёт в звонок или письмо. Позже добавим загрузку фото,
              автосборку BOM и статус обработки в админке.
            </p>
          </div>

          <div className="lead-actions">
            <a href="tel:+79650756555" className="button">
              <Phone size={16} /> Позвонить инженеру
            </a>
            <a href="mailto:office@dimohod-trade.ru" className="button secondary">
              <Mail size={16} /> Отправить материалы
            </a>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="page footer-inner">
          <div className="footer-brand">
            <strong>Дымоход Трейд</strong>
            <p>Специализированный магазин дымоходных систем и комплектующих.</p>
          </div>

          <div className="footer-nav">
            <strong>Основные разделы</strong>
            <Link href="/catalog">Каталог</Link>
            <Link href="/catalog?scenario=banya">Дымоход для бани</Link>
            <Link href="/catalog?scenario=kamin">Дымоход для камина</Link>
            <Link href="/catalog?scenario=gaz">Дымоход для газового котла</Link>
          </div>

          <div className="footer-contacts">
            <strong>Контакты</strong>
            <a href="tel:+79650756555" className="footer-contact-row">
              <Phone size={14} /> +7 (965) 075-65-55
            </a>
            <a href="mailto:office@dimohod-trade.ru" className="footer-contact-row">
              <Mail size={14} /> office@dimohod-trade.ru
            </a>
            <p className="footer-address">
              <MapPin size={14} />
              <span>
                192019, г. Санкт-Петербург,
                <br />
                ул. Хрустальная, дом № 11, литера Б
              </span>
            </p>
            <p className="footer-legal">
              ООО "Дымоходы-трейд плюс"
              <br />
              ОГРН 1177847018216
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="page">© 2026 Дымоход Трейд. Все права защищены.</div>
        </div>
      </footer>
    </main>
  );
}
