import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Camera,
  Check,
  FileText,
  FlameKindling,
  Home,
  Map,
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
              <Link className={styles.primaryButton} href={configuratorHref}>
                Подобрать комплект
                <ArrowRight size={18} aria-hidden />
              </Link>
              <a className={styles.secondaryButton} href="#source-data">
                Что подготовить
              </a>
            </div>
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
            <p className={styles.reviewLabel}>Статус результата</p>
            <h2>Сначала черновик, затем проверка</h2>
          </div>
          <p>
            Конфигуратор показывает предварительный состав. Недостающие параметры сохраняются в
            списке уточнений, а проверенный статус появляется только после действия специалиста.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.shell}>
          <div className={styles.sectionIntro}>
            <h2>Частые вопросы</h2>
          </div>
          <div className={styles.faqList}>
            {content.faq.map((item) => (
              <details key={item.question}>
                <summary>{item.question}</summary>
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
