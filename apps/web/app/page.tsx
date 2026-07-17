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

const scenarios = [
  {
    icon: FlameKindling,
    slug: "banya",
    title: "Баня и сауна",
    desc: "Высокая температура, деревянные перекрытия, проходка и пожарные отступы.",
    result: "Комплект от печи до оголовка",
    badge: "самый частый",
  },
  {
    icon: Home,
    slug: "kamin",
    title: "Камин",
    desc: "Вертикальный канал, эстетика в помещении, ревизия и подключение к топке.",
    result: "Схема подключения и список элементов",
    badge: null,
  },
  {
    icon: Waves,
    slug: "gaz",
    title: "Газовый котел",
    desc: "Конденсат, герметичность, кислотостойкая сталь и требования к материалам.",
    result: "Безопасная система под оборудование",
    badge: null,
  },
  {
    icon: Zap,
    slug: "tt-kotel",
    title: "Твердотопливный котел",
    desc: "Температура, тяга, смолы, толщина стали и устойчивость к перегреву.",
    result: "Подбор стали, диаметра и высоты",
    badge: null,
  },
  {
    icon: Wrench,
    slug: "gilzovanie",
    title: "Гильзование канала",
    desc: "Ремонт старой шахты, вставка нержавеющего канала, ревизии и конденсатоотвод.",
    result: "План восстановления дымового канала",
    badge: null,
  },
];

const marketGaps = [
  {
    title: "Маркетплейс продает деталь",
    text: "Быстро купить трубу можно почти везде, но покупатель все равно остается один на один с вопросом: подойдет ли она к моей печи?",
  },
  {
    title: "Производитель показывает каталог",
    text: "Каталог полезен монтажнику, но новичку нужен перевод задачи в комплект: диаметр, проходка, крепеж, ревизия, оголовок.",
  },
  {
    title: "Ошибка стоит дорого",
    text: "Неправильный материал, диаметр или проход через перекрытие — это не просто возврат товара, а риск для безопасности.",
  },
];

const calculatorSteps = [
  {
    icon: FlameKindling,
    title: "1. Источник тепла",
    text: "Банная печь, камин, газовый или твердотопливный котел.",
  },
  {
    icon: Ruler,
    title: "2. Диаметр и маршрут",
    text: "Патрубок, высота, повороты, проход через стену или кровлю.",
  },
  {
    icon: ShieldCheck,
    title: "3. Безопасность",
    text: "Материал, изоляция, отступы, узлы прохода и совместимость.",
  },
  {
    icon: ClipboardCheck,
    title: "4. Спецификация",
    text: "BOM-комплект, цена, документы и заявка инженеру.",
  },
];

const catalogEntries = [
  "Сэндвич-трубы",
  "Одноконтурные трубы",
  "Отводы и колена",
  "Тройники и ревизии",
  "Проходные узлы",
  "Оголовки и дефлекторы",
  "Хомуты и крепеж",
  "Стартовые элементы",
];

const compatibilityChecks = [
  "Диаметр внутреннего канала и патрубка",
  "Марка стали под температуру и конденсат",
  "Переходы между одноконтурным и сэндвич-участком",
  "Проход через дерево, стену и кровлю",
  "Совместимость тройников, ревизий и оголовка",
  "Документы: сертификаты, инструкции, пожарная безопасность",
];

const productCardBlocks = [
  {
    icon: Camera,
    title: "Фото, чертеж, монтаж",
    text: "Главное фото изделия, размерный чертеж и фото в установленной системе.",
  },
  {
    icon: Gauge,
    title: "Характеристики и SKU",
    text: "Диаметр, сталь, толщина, длина, артикулы, цены и остатки.",
  },
  {
    icon: CheckCircle2,
    title: "Совместимость",
    text: "С чем работает, где нельзя применять, какие элементы нужны рядом.",
  },
  {
    icon: FileText,
    title: "Документы",
    text: "Сертификаты, инструкции по монтажу и материалы по пожарной безопасности.",
  },
];

const mediaBlocks = [
  {
    icon: Video,
    title: "Видео монтажа",
    text: "Короткие ролики по проходке, стыковке, креплению и ревизии.",
  },
  {
    icon: FileText,
    title: "Инструкции и сертификаты",
    text: "PDF-документы рядом с карточкой и в базе знаний.",
  },
  {
    icon: Truck,
    title: "Доставка и комплектация",
    text: "Проверка комплекта перед отгрузкой, доставка по России.",
  },
];

export default function HomePage() {
  return (
    <main className="home-wireframe">
      <section className="wire-hero">
        <div className="page wire-hero-grid">
          <div className="wire-hero-copy">
            <p className="eyebrow">Каркас главной · платформа подбора дымоходных систем</p>
            <h1>
              Помогаем купить не трубу,
              <br />
              <span className="accent-text">а безопасный комплект дымохода.</span>
            </h1>
            <p className="lead">
              Главная должна быстро понять задачу клиента: баня, камин, котел или гильзование —
              и привести его к совместимой спецификации, заявке инженеру или нужной категории.
            </p>
            <div className="actions">
              <Link className="button" href="/catalog">
                Перейти в каталог <ArrowRight size={17} />
              </Link>
              <a href="tel:+79650756555" className="button secondary">
                <Phone size={17} /> Получить подбор
              </a>
            </div>
          </div>

          <aside className="wire-selector" aria-label="Быстрый выбор сценария">
            <div className="wire-selector-head">
              <span>01</span>
              <strong>Сначала сценарий, потом товар</strong>
            </div>
            <div className="wire-scenario-list">
              {scenarios.map((scenario) => {
                const Icon = scenario.icon;
                return (
                  <Link
                    key={scenario.slug}
                    className="wire-scenario-row"
                    href={`/catalog?scenario=${scenario.slug}`}
                  >
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
        </div>
      </section>

      <section className="wire-strip">
        <div className="page wire-strip-grid">
          <div>
            <ShieldCheck size={20} />
            <strong>Совместимость важнее корзины</strong>
            <span>Главный конверсионный путь — заявка из подбора.</span>
          </div>
          <div>
            <ShoppingBag size={20} />
            <strong>Каталог остается быстрым</strong>
            <span>Профессионал должен сразу найти артикул и цену.</span>
          </div>
          <div>
            <FileText size={20} />
            <strong>Документы рядом с товаром</strong>
            <span>Сертификаты, инструкции, пожарная безопасность.</span>
          </div>
          <div>
            <Truck size={20} />
            <strong>Доставка по России</strong>
            <span>Комплектуем заказ из Санкт-Петербурга.</span>
          </div>
        </div>
      </section>

      <section className="page section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Почему такой каркас</p>
            <h2>Рынку не хватает не ассортимента, а уверенности в выборе.</h2>
          </div>
          <p className="section-lead">
            По архитектуре проекта мы строим платформу подбора: SEO-сценарии приводят трафик,
            каталог дает ассортимент, калькулятор собирает комплект, а инженерская заявка снимает
            риск несовместимости.
          </p>
        </div>

        <div className="wire-card-grid three">
          {marketGaps.map((gap) => (
            <article key={gap.title} className="wire-card">
              <span className="wire-card-index">рынок</span>
              <h3>{gap.title}</h3>
              <p>{gap.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="wire-muted-section">
        <div className="page">
          <div className="section-head">
            <div>
              <p className="eyebrow">Сценарные входы</p>
              <h2>Пять главных дверей на сайт.</h2>
            </div>
            <p className="section-lead">
              Эти блоки потом станут SEO-посадочными: “дымоход для бани”, “дымоход для камина”,
              “дымоход для газового котла” и так далее.
            </p>
          </div>

          <div className="wire-card-grid five">
            {scenarios.map((scenario) => {
              const Icon = scenario.icon;
              return (
                <Link
                  key={scenario.slug}
                  className="wire-scenario-card"
                  href={`/catalog?scenario=${scenario.slug}`}
                >
                  <span className="scenario-card-icon">
                    <Icon size={24} />
                  </span>
                  <h3>{scenario.title}</h3>
                  <p>{scenario.desc}</p>
                  <span className="scenario-card-link">
                    Открыть подбор <ArrowRight size={14} />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="page section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Калькулятор v1</p>
            <h2>Главный интерактивный блок: собрать комплект.</h2>
          </div>
          <p className="section-lead">
            На первом этапе это может быть форма-заявка с пошаговыми вопросами. Позже — полноценный
            rule engine, BOM-смета и PDF-спецификация.
          </p>
        </div>

        <div className="wire-flow">
          {calculatorSteps.map((step) => {
            const Icon = step.icon;
            return (
              <article key={step.title} className="wire-step-card">
                <span>
                  <Icon size={21} />
                </span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="page section wire-split">
        <div>
          <p className="eyebrow">Каталог</p>
          <h2>Быстрый путь для тех, кто уже знает деталь.</h2>
          <p className="section-lead">
            Каталог на главной нужен не как простая витрина, а как понятная карта системы:
            трубы, соединения, проходки, крепеж, завершение канала.
          </p>
          <Link className="button wire-inline-button" href="/catalog">
            Смотреть все категории <ArrowRight size={16} />
          </Link>
        </div>

        <div className="wire-category-map">
          {catalogEntries.map((entry) => (
            <Link key={entry} href="/catalog" className="wire-category-pill">
              {entry}
              <ChevronRight size={14} />
            </Link>
          ))}
        </div>
      </section>

      <section className="wire-dark-section">
        <div className="page wire-split">
          <div>
            <p className="eyebrow">Совместимость</p>
            <h2>Блок доверия: что именно мы проверяем.</h2>
            <p>
              Это должно быть видно уже на главной: мы не просто “перезваниваем”, а проверяем
              техническую связку элементов и условия монтажа.
            </p>
          </div>

          <ul className="wire-check-list">
            {compatibilityChecks.map((check) => (
              <li key={check}>
                <CheckCircle2 size={18} />
                <span>{check}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="page section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Карточка товара</p>
            <h2>Главная должна заранее объяснять, что будет внутри карточки.</h2>
          </div>
          <p className="section-lead">
            Для дымоходов карточка товара — это не только цена. В ней должны быть фото, чертеж,
            характеристики, совместимость, документы и монтажные материалы.
          </p>
        </div>

        <div className="wire-product-anatomy">
          <div className="wire-product-preview">
            <div className="wire-image-placeholder">Фото изделия</div>
            <div className="wire-thumb-row">
              <span>Чертеж</span>
              <span>В системе</span>
              <span>Видео</span>
            </div>
          </div>
          <div className="wire-card-grid two">
            {productCardBlocks.map((block) => {
              const Icon = block.icon;
              return (
                <article key={block.title} className="wire-card compact">
                  <Icon size={20} />
                  <h3>{block.title}</h3>
                  <p>{block.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="wire-muted-section">
        <div className="page">
          <div className="section-head">
            <div>
              <p className="eyebrow">Медиа и база знаний</p>
              <h2>Фото, видео и документы — отдельный слой доверия.</h2>
            </div>
            <p className="section-lead">
              Логику хранения мы уже ведем к структуре product/media: фото, видео и documents.
              На главной этот слой стоит показать как обещание прозрачности.
            </p>
          </div>

          <div className="wire-card-grid three">
            {mediaBlocks.map((block) => {
              const Icon = block.icon;
              return (
                <article key={block.title} className="wire-card">
                  <Icon size={22} />
                  <h3>{block.title}</h3>
                  <p>{block.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="wire-lead-section">
        <div className="page wire-lead-card">
          <div>
            <p className="eyebrow">Финальный CTA</p>
            <h2>Пришлите фото печи — соберем совместимый комплект.</h2>
            <p>
              Для MVP этот блок ведет в заявку. Потом сюда добавим загрузку фото, выбор сценария,
              автосборку BOM и статус обработки в админке.
            </p>
          </div>

          <div className="wire-lead-form">
            <div className="wire-input">Имя и телефон</div>
            <div className="wire-input">Сценарий: баня / камин / котел</div>
            <div className="wire-input tall">Фото, план или комментарий</div>
            <div className="actions">
              <a href="tel:+79650756555" className="button">
                <Phone size={16} /> Позвонить
              </a>
              <a href="mailto:office@dimohod-trade.ru" className="button secondary">
                <Mail size={16} /> Отправить материалы
              </a>
            </div>
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
