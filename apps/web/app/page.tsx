import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  FileText,
  FlameKindling,
  Home,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Truck,
  Waves,
  Zap,
} from "lucide-react";

const scenarios = [
  {
    icon: FlameKindling,
    slug: "banya",
    title: "Банная печь",
    desc: "Высокие температуры, проход через деревянное перекрытие, правильный диаметр патрубка.",
    badge: "Популярный",
  },
  {
    icon: Home,
    slug: "kamin",
    title: "Камин",
    desc: "Эстетика, высота канала, ревизия, состыковка с топкой, проход через стену или кровлю.",
    badge: null,
  },
  {
    icon: Waves,
    slug: "gaz",
    title: "Газовый котел",
    desc: "Конденсатостойкие материалы, кислотостойкая сталь, специальные требования к герметичности.",
    badge: null,
  },
  {
    icon: Zap,
    slug: "kotyor",
    title: "Твердотопливный котел",
    desc: "Высокая температура, марка стали, толщина стенки, защита от конденсата и образования смолы.",
    badge: null,
  },
];

const trustItems = [
  {
    icon: ShieldCheck,
    text: "Сертифицированная продукция",
    sub: "Пожарные документы на каждый товар",
  },
  { icon: FileText, text: "Подбор специалистом", sub: "Бесплатная проверка совместимости" },
  { icon: Truck, text: "Доставка по всей России", sub: "Из Санкт-Петербурга, сборные грузы" },
  {
    icon: FlameKindling,
    text: "Только дымоходные системы",
    sub: "Узкая специализация = экспертиза",
  },
];

const pillars = [
  {
    num: "01",
    title: "Каталог по сценарию",
    text: "Вы не знаете артикул трубы, вы знаете, что у вас баня или камин. Мы начинаем с задачи, а не с абстрактного фильтра.",
  },
  {
    num: "02",
    title: "Совместимость внутри заявки",
    text: "Каждый элемент в карточке объясняет, с чем он работает, а с чем нет. Не купите несовместимый комплект случайно.",
  },
  {
    num: "03",
    title: "Инженер отвечает за 15 минут",
    text: "Отправьте фото печи и план прохода через кровлю. Получите проверенную спецификацию, а не просто счет.",
  },
];

export default function HomePage() {
  return (
    <main>
      <section className="hero-wrap">
        <div className="page hero-inner">
          <div className="hero-text">
            <p className="eyebrow">Специализированный магазин дымоходных систем · Санкт-Петербург</p>
            <h1>
              Дымоход - это система.
              <br />
              <span className="accent-text">Мы помогаем ее собрать.</span>
            </h1>
            <p className="lead">
              Сэндвич-трубы, отводы, проходные узлы, хомуты, оголовки. Подбираем по вашему
              оборудованию, объясняем совместимость и не продаем то, что не подойдет.
            </p>
            <div className="actions">
              <Link className="button" href="/catalog">
                Открыть каталог <ArrowRight size={17} />
              </Link>
              <a href="tel:+79650756555" className="button secondary">
                <Phone size={17} /> Позвонить специалисту
              </a>
            </div>
          </div>

          <div className="hero-scenarios-panel">
            <p className="panel-label">Выберите сценарий</p>
            <div className="scenarios-list">
              {scenarios.map((scenario) => {
                const Icon = scenario.icon;
                return (
                  <Link
                    key={scenario.slug}
                    href={`/catalog?scenario=${scenario.slug}`}
                    className="scenario-row"
                  >
                    <span className="scenario-icon-wrap">
                      <Icon size={18} />
                    </span>
                    <span className="scenario-row-text">
                      <strong>{scenario.title}</strong>
                      <span>{scenario.desc}</span>
                    </span>
                    {scenario.badge ? <span className="badge">{scenario.badge}</span> : null}
                    <ChevronRight size={16} className="scenario-arrow" />
                  </Link>
                );
              })}
            </div>
            <div className="panel-contact">
              <Phone size={14} />
              <a href="tel:+79650756555">+7 (965) 075-65-55</a>
              <span className="dot">·</span>
              <a href="mailto:office@dimohod-trade.ru">office@dimohod-trade.ru</a>
            </div>
          </div>
        </div>
      </section>

      <div className="trust-strip">
        <div className="page trust-inner">
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.text} className="trust-item">
                <Icon size={20} color="var(--accent)" />
                <div>
                  <strong>{item.text}</strong>
                  <span>{item.sub}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <section className="page section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Наш подход</p>
            <h2>Продаем системы, а не отдельные детали.</h2>
          </div>
          <p className="section-lead">
            Российский рынок дымоходов фрагментирован. Производители сильны в продукте,
            маркетплейсы - в скорости, но почти никто не закрывает главный страх: "я куплю
            несовместимый комплект". Мы закрываем.
          </p>
        </div>

        <div className="pillars-grid">
          {pillars.map((pillar) => (
            <article key={pillar.num} className="pillar-card">
              <span className="pillar-num">{pillar.num}</span>
              <h3>{pillar.title}</h3>
              <p>{pillar.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="scenarios-section">
        <div className="page">
          <p className="eyebrow">Частные случаи</p>
          <h2>С чего обычно начинают</h2>
          <div className="scenarios-grid">
            {scenarios.map((scenario) => {
              const Icon = scenario.icon;
              return (
                <Link
                  key={scenario.slug}
                  href={`/catalog?scenario=${scenario.slug}`}
                  className="scenario-card"
                >
                  <div className="scenario-card-icon">
                    <Icon size={24} />
                  </div>
                  <h3>{scenario.title}</h3>
                  <p>{scenario.desc}</p>
                  <span className="scenario-card-link">
                    Подобрать систему <ArrowRight size={14} />
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
            <p className="eyebrow">Процесс</p>
            <h2>Как мы работаем</h2>
          </div>
          <p className="section-lead">
            Три шага от вопроса к готовому комплекту. Без "сами разберитесь" и без случайных
            несовместимостей.
          </p>
        </div>

        <div className="steps-grid">
          <div className="step">
            <div className="step-num">1</div>
            <h3>Расскажите о задаче</h3>
            <p>
              Фото печи или котла, диаметр патрубка, план дома, этажность, тип перекрытия - все
              что есть. Позвоните или напишите в мессенджер.
            </p>
          </div>
          <div className="step-connector" aria-hidden />
          <div className="step">
            <div className="step-num">2</div>
            <h3>Получите спецификацию</h3>
            <p>
              Инженер проверит совместимость и составит список всех элементов: трубы, отводы,
              хомуты, проходные узлы, оголовок.
            </p>
          </div>
          <div className="step-connector" aria-hidden />
          <div className="step">
            <div className="step-num">3</div>
            <h3>Оформите заявку</h3>
            <p>
              Подтверждаете список, оформляем отгрузку из Санкт-Петербурга. Доставка по всей
              России, сборные и брендовые грузы.
            </p>
          </div>
        </div>
      </section>

      <section className="cta-banner-wrap">
        <div className="page cta-banner">
          <div>
            <h2>Не знаете, что именно нужно?</h2>
            <p>
              Пришлите фото печи, и мы подберем совместимую систему бесплатно. Без обязательства
              купить.
            </p>
          </div>
          <div className="cta-actions">
            <a href="tel:+79650756555" className="button">
              <Phone size={16} /> +7 (965) 075-65-55
            </a>
            <a href="mailto:office@dimohod-trade.ru" className="button secondary">
              <Mail size={16} /> office@dimohod-trade.ru
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
            <strong>Каталог</strong>
            <Link href="/catalog">Все категории</Link>
            <Link href="/catalog?scenario=banya">Для бани</Link>
            <Link href="/catalog?scenario=kamin">Для камина</Link>
            <Link href="/catalog?scenario=gaz">Для газа</Link>
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
