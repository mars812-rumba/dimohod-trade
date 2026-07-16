import Link from "next/link";
import { ArrowRight, FlameKindling, Home, Ruler, ShieldCheck, Waves } from "lucide-react";
import { ScenarioCard } from "@/components/ScenarioCard";

const scenarios = [
  {
    icon: FlameKindling,
    title: "Баня и печь",
    text: "Подбор по диаметру печи, проходам, высоте, сэндвич-участкам и элементам безопасности.",
  },
  {
    icon: Home,
    title: "Камин",
    text: "Акцент на эстетику, высоту канала, ревизию и правильную стыковку с топкой.",
  },
  {
    icon: Waves,
    title: "Газовый котел",
    text: "Отдельный сценарий с требованиями к материалам, конденсату и совместимости узлов.",
  },
];

export default function HomePage() {
  return (
    <main className="page">
      <section className="hero">
        <div className="hero-main">
          <p className="eyebrow">MVP foundation: каталог, товары, дальше калькулятор</p>
          <h1>Дымоходы, которые собираются в понятную систему.</h1>
          <p className="lead">
            Начинаем платформу с каталога и товарных карточек. Следующий шаг - калькулятор,
            который собирает комплект по сценарию, высоте, диаметру и условиям прохода.
          </p>
          <div className="actions">
            <Link className="button" href="/catalog">
              Открыть каталог <ArrowRight size={18} />
            </Link>
            <Link
              className="button secondary"
              href="/product/sendvich-truba-115-200-nerzhaveyushchaya-stal-08"
            >
              Demo-товар
            </Link>
          </div>
        </div>

        <aside className="hero-panel" aria-label="Engineering summary">
          <div className="spec-grid">
            <div className="spec">
              <span>API</span>
              <strong>FastAPI</strong>
            </div>
            <div className="spec">
              <span>DB</span>
              <strong>Postgres</strong>
            </div>
            <div className="spec">
              <span>Catalog</span>
              <strong>Дерево</strong>
            </div>
            <div className="spec">
              <span>Next</span>
              <strong>App Router</strong>
            </div>
          </div>
        </aside>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Сценарии покупателя</p>
            <h2>Стартуем с реальных задач, а не с абстрактных фильтров.</h2>
          </div>
          <p>
            Каталог будет объяснять совместимость, а калькулятор - собирать комплект, который можно
            проверить и отправить в заявку.
          </p>
        </div>
        <div className="grid">
          {scenarios.map((scenario) => (
            <ScenarioCard key={scenario.title} {...scenario} />
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Ближайшая вертикаль</p>
            <h2>Калькулятор после основы каталога.</h2>
          </div>
          <p>
            В его контракт уже просится высота, тип источника, диаметр, количество проходов,
            материалы и правила совместимости.
          </p>
        </div>
        <div className="grid">
          <article className="card">
            <Ruler size={22} color="var(--accent)" />
            <h3>Параметры</h3>
            <p>Высота, диаметр, тип установки, проходы через перекрытие и кровлю.</p>
          </article>
          <article className="card">
            <ShieldCheck size={22} color="var(--accent)" />
            <h3>Правила</h3>
            <p>Совместимость элементов и предупреждения до отправки заявки.</p>
          </article>
          <article className="card">
            <ArrowRight size={22} color="var(--accent)" />
            <h3>Заявка</h3>
            <p>Итоговый комплект, PDF, контакты и CRM-интеграция в следующих шагах.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
