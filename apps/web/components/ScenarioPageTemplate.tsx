import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  AlertTriangle,
  Building2,
  Camera,
  Check,
  ChevronDown,
  FileText,
  FlameKindling,
  Home,
  Map,
  NotebookTabs,
  Ruler,
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  scenarioConfiguratorHref,
  type ScenarioIconName,
  type ScenarioPageContent,
} from "@/lib/scenarioPages";
import { BanyaIntakeFlow } from "./BanyaIntakeFlow";
import styles from "./ScenarioPageTemplate.module.css";

const iconByName: Record<ScenarioIconName, LucideIcon> = {
  building: Building2,
  camera: Camera,
  file: FileText,
  flame: FlameKindling,
  home: Home,
  route: Map,
  ruler: Ruler,
  shield: ShieldCheck,
  wrench: Wrench,
};

type ScenarioPageTemplateProps = {
  content: ScenarioPageContent;
  assetBasePath?: string;
};

export function ScenarioPageTemplate({
  content,
  assetBasePath = "",
}: ScenarioPageTemplateProps) {
  const configuratorHref = scenarioConfiguratorHref(content);

  return (
    <main className={styles.main}>
      <div className={styles.shell}>
        <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span aria-hidden>/</span>
          <Link href="/solutions">Решения</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">{content.eyebrow}</span>
        </nav>
      </div>

      <section className={styles.hero}>
        <div className={`${styles.shell} ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{content.eyebrow}</p>
            <h1>{content.title}</h1>
            <p className={styles.heroSummary}>{content.summary}</p>
            <div className={styles.heroActions}>
              <Link
                className={styles.primaryButton}
                href={content.interactiveIntake ? "#scenario-intake" : configuratorHref}
              >
                {content.heroPrimaryLabel ?? "Подобрать комплект"}
                <ArrowRight size={18} aria-hidden />
              </Link>
              <a
                className={styles.secondaryButton}
                href="#source-data"
              >
                {content.heroSecondaryLabel ?? "Что подготовить"}
              </a>
            </div>
            {content.heroNote ? <p className={styles.heroNote}>{content.heroNote}</p> : null}
          </div>

          <div className={styles.heroMedia}>
            <Image
              src={`${assetBasePath}${content.heroImage}`}
              alt={content.heroImageAlt}
              fill
              priority
              fetchPriority="high"
              quality={78}
              sizes="(max-width: 820px) 100vw, 46vw"
            />
          </div>
        </div>
      </section>

      {content.interactiveIntake ? (
        <BanyaIntakeFlow content={content} assetBasePath={assetBasePath} />
      ) : null}

      {content.diameterGuide || content.guidance ? (
        <section className={styles.guideSection} aria-labelledby="scenario-guide-title">
          <div className={styles.shell}>
            {content.diameterGuide ? (
              <div className={styles.diameterGuide}>
                <div className={styles.sectionIntro}>
                  <p className={styles.guideLabel}>Ориентир, не готовый подбор</p>
                  <h2 id="scenario-guide-title">{content.diameterGuide.title}</h2>
                  <p>{content.diameterGuide.description}</p>
                </div>
                <div className={styles.tableWrap}>
                  <table className={styles.diameterTable}>
                    <thead>
                      <tr>
                        <th scope="col">Оборудование</th>
                        <th scope="col">Паспортный ориентир</th>
                        <th scope="col">Что это значит</th>
                      </tr>
                    </thead>
                    <tbody>
                      {content.diameterGuide.rows.map((row) => (
                        <tr key={`${row.equipment}-${row.diameter}`}>
                          <th scope="row">{row.equipment}</th>
                          <td>{row.diameter}</td>
                          <td>{row.explanation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className={styles.guideNote}>
                  <AlertTriangle size={18} strokeWidth={1.8} aria-hidden />
                  <span>{content.diameterGuide.note}</span>
                </p>
                {content.diameterGuide.sources?.length ? (
                  <p className={styles.guideSources}>
                    <span>Источники примеров:</span>
                    {content.diameterGuide.sources.map((source) => (
                      <a href={source.href} key={source.href} target="_blank" rel="noopener noreferrer">
                        {source.label}
                      </a>
                    ))}
                  </p>
                ) : null}
              </div>
            ) : null}

            {content.guidance ? (
              <>
              {!content.diameterGuide ? (
                <div className={styles.sectionIntro}>
                  <p className={styles.guideLabel}>Выберите правильный сценарий</p>
                  <h2 id="scenario-guide-title">Что нужно определить до подбора</h2>
                  <p>Сначала собираем проверяемые исходные данные, затем переходим к конкретным изделиям.</p>
                </div>
              ) : null}
              <div className={styles.guidanceGrid}>
                <article className={styles.guidanceItem}>
                  <h3>Что проверить в паспорте</h3>
                  <ul>
                    {content.guidance.passport.map((item) => (
                      <li key={item}>
                        <NotebookTabs size={17} strokeWidth={1.7} aria-hidden />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
                <article className={styles.guidanceItem}>
                  <h3>Материал и исполнение</h3>
                  <ul>
                    {content.guidance.material.map((item) => (
                      <li key={item}>
                        <Wrench size={17} strokeWidth={1.7} aria-hidden />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
                <article className={styles.guidanceItem}>
                  <h3>Что проверить по безопасности</h3>
                  <ul>
                    {content.guidance.safety.map((item) => (
                      <li key={item}>
                        <ShieldCheck size={17} strokeWidth={1.7} aria-hidden />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
                <article className={`${styles.guidanceItem} ${styles.mistakeItem}`}>
                  <h3>Типовые ошибки</h3>
                  <ul>
                    {content.guidance.mistakes.map((item) => (
                      <li key={item}>
                        <AlertTriangle size={17} strokeWidth={1.7} aria-hidden />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </div>
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      {!content.interactiveIntake ? (
      <>
      <section className={styles.section} id="source-data">
        <div className={styles.shell}>
          <div className={styles.sectionIntro}>
            <h2>С чего начать расчёт</h2>
            <p>Подготовьте исходные данные. Если части информации нет, отметим её для уточнения.</p>
          </div>
          <div className={styles.inputGrid}>
            {content.requiredInputs.map((item) => {
              const Icon = iconByName[item.icon];
              return (
                <article className={styles.inputItem} key={item.title}>
                  <Icon size={22} strokeWidth={1.7} aria-hidden />
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
          <aside className={styles.measureNote}>
            <Ruler size={23} strokeWidth={1.7} aria-hidden />
            <div>
              <h3>Как зафиксировать размер патрубка</h3>
              <p>
                Сначала найдите размер в паспорте. Дополнительно сфотографируйте шильдик и
                соединение рядом с линейкой или штангенциркулем, укажите внутренний и наружный
                размеры, если они доступны. Не измеряйте горячее или работающее оборудование —
                тип соединения и окончательный размер проверит специалист.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className={styles.routeSection}>
        <div className={styles.shell}>
          <div className={styles.sectionIntro}>
            <h2>{content.routeSectionTitle ?? "Выберите вариант трассы"}</h2>
            <p>
              {content.routeSectionDescription ??
                "Это отправная точка. Точный состав появится после проверки размеров и маршрута."}
            </p>
          </div>
          <div className={styles.routeGrid}>
            {content.routeOptions.map((option) => {
              const body = (
                <>
                {option.image ? (
                  <div className={styles.routeImage}>
                    <Image
                      src={`${assetBasePath}${option.image}`}
                      alt=""
                      fill
                      loading="lazy"
                      quality={72}
                      sizes="(max-width: 620px) calc(100vw - 32px), (max-width: 820px) 50vw, 540px"
                    />
                  </div>
                ) : (
                  <Map className={styles.routeIcon} size={30} strokeWidth={1.5} aria-hidden />
                )}
                <div>
                  <h3>{option.title}</h3>
                  <p>{option.description}</p>
                  {option.href ? (
                    <span>
                      Открыть сценарий <ArrowRight size={15} aria-hidden />
                    </span>
                  ) : null}
                </div>
                </>
              );

              return option.href ? (
                <Link className={styles.routeOption} href={option.href} key={option.slug}>
                  {body}
                </Link>
              ) : (
                <article className={styles.routeOption} key={option.slug}>
                  {body}
                </article>
              );
            })}
          </div>
        </div>
      </section>
      </>
      ) : null}

      <section className={styles.section}>
        <div className={`${styles.shell} ${styles.selectionLayout}`}>
          <div className={styles.selectionHeading}>
            <ShieldCheck size={30} strokeWidth={1.6} aria-hidden />
            <h2>Что влияет на состав</h2>
            <p>Ответы становятся условиями расчёта, а не общими рекомендациями.</p>
          </div>
          <div className={styles.questionList}>
            {content.selectionQuestions.map((item) => (
              <article key={item.title}>
                <Check size={18} aria-hidden />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.systemSection}>
        <div className={styles.shell}>
          <div className={styles.sectionIntro}>
            <h2>Из чего складывается система</h2>
            <p>После ввода параметров группы связываются с реальными позициями каталога.</p>
          </div>
          <div className={styles.groupGrid}>
            {content.relatedGroups.map((group) => {
              const body = (
                <>
                  <h3>{group.title}</h3>
                  <p>{group.description}</p>
                  {group.categorySlug ? (
                    <span>
                      Смотреть изделия <ArrowRight size={15} aria-hidden />
                    </span>
                  ) : null}
                </>
              );

              return group.categorySlug ? (
                <Link
                  className={styles.groupItem}
                  href={`/catalog/${group.categorySlug}`}
                  key={group.title}
                >
                  {body}
                </Link>
              ) : (
                <article className={styles.groupItem} key={group.title}>
                  {body}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.reviewSection}>
        <div className={`${styles.shell} ${styles.reviewLayout}`}>
          <div>
            <p className={styles.reviewLabel}>Граница ответственности</p>
            <h2>Что видно сразу, а что требует проверки</h2>
          </div>
          <div className={styles.reviewColumns}>
            <div>
              <h3>Можем собрать сразу</h3>
              <ul>
                <li><Check size={16} aria-hidden /><span>паспортные параметры и фотографии объекта;</span></li>
                <li><Check size={16} aria-hidden /><span>геометрию трассы по указанным параметрам;</span></li>
                <li><Check size={16} aria-hidden /><span>предварительный список реальных позиций.</span></li>
              </ul>
            </div>
            <div>
              <h3>Проверяет специалист</h3>
              <ul>
                <li><ShieldCheck size={16} aria-hidden /><span>совместимость оборудования и элементов;</span></li>
                <li><ShieldCheck size={16} aria-hidden /><span>проходы, крепление и условия монтажа;</span></li>
                <li><ShieldCheck size={16} aria-hidden /><span>финальный состав перед заказом.</span></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.faqSection}`}>
        <div className={styles.shell}>
          <div className={`${styles.sectionIntro} ${styles.faqHeading}`}>
            <h2>Частые вопросы</h2>
          </div>
          <div className={styles.faqList}>
            {content.faq.map((item) => (
              <details key={item.question}>
                <summary>
                  <span>{item.question}</span>
                  <ChevronDown size={20} strokeWidth={1.7} aria-hidden />
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div className={`${styles.shell} ${styles.finalCtaLayout}`}>
          <div>
            <h2>Соберите исходные данные в одном расчёте</h2>
            <p>Получите схему и список позиций, которые можно отправить специалисту на проверку.</p>
          </div>
          <Link className={styles.primaryButton} href={configuratorHref}>
            Подобрать комплект
            <ArrowRight size={18} aria-hidden />
          </Link>
        </div>
      </section>
    </main>
  );
}
