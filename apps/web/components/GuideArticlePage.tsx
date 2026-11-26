import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import {
  IconAlertTriangle as AlertTriangle,
  IconArrowRight as ArrowRight,
  IconBook2 as BookOpen,
  IconCheck as Check,
  IconClock as Clock,
  IconExternalLink as ExternalLink,
} from "@tabler/icons-react";
import {
  guideArticleBySlug,
  guideConfiguratorHref,
  type GuideArticle,
} from "@/lib/guideArticles";
import styles from "./GuideArticlePage.module.css";
import { guideDate } from "@/lib/guidePresentation";
import { GuideEstimateExample } from "./GuideEstimateExample";
import { GuideProjectCosts } from "./GuideProjectCosts";
import { GuideStoveActions } from "./GuideStoveActions";
import { LeadForm } from "./LeadForm";
import { GuideImagePair, GuideRouteActions, GuideRoutePrices, GuideRouteSchemes } from "./GuideRouteComparison";

type GuideArticlePageProps = {
  article: GuideArticle;
};

export function GuideArticlePage({ article }: GuideArticlePageProps) {
  const assetBasePath = process.env.NEXT_BASE_PATH ?? "";
  const isStoveGuide = article.slug === "komplekt-dymohoda-dlya-pechi";
  const isRouteComparison = article.layout === "route-comparison";
  const usesQuickCalculation = isStoveGuide || isRouteComparison;
  const calculationHref = usesQuickCalculation ? "/bystryy-raschet" : guideConfiguratorHref;
  const calculationClassName = `${styles.primaryButton}${usesQuickCalculation ? ` ${styles.costButton}` : ""}`;
  const related = article.relatedSlugs
    .map((slug) => guideArticleBySlug[slug])
    .filter(Boolean);

  return (
    <main className={styles.main}>
      <div className={styles.shell}>
        <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span aria-hidden>/</span>
          <Link href="/guides">Статьи</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">{article.shortTitle}</span>
        </nav>
      </div>

      <article>
        <header className={styles.hero}>
          <div className={`${styles.shell} ${styles.heroGrid}${isRouteComparison ? ` ${styles.comparisonHero}` : ""}`}>
            <div className={styles.heroCopy}>
              {!isRouteComparison ? <p className={styles.eyebrow}>{article.eyebrow}</p> : null}
              <h1>{article.title}</h1>
              <p className={styles.lead}>{article.summary}</p>
              <div className={styles.meta}>
                <span><Clock size={17} aria-hidden /> {article.readingTime}</span>
                <span>Обновлено <time dateTime={article.modifiedAt}>{guideDate(article.modifiedAt)}</time></span>
              </div>
              {!isRouteComparison ? <Link className={calculationClassName} href={calculationHref}>
                {isStoveGuide ? "Рассчитать стоимость" : "Рассчитать свой комплект"} <ArrowRight size={18} aria-hidden />
              </Link> : null}
            </div>
            {!isRouteComparison ? <figure
              className={`${styles.heroFigure} ${article.imageLayout === "portrait" ? styles.heroFigurePortrait : ""}`}
            >
              <Image
                alt={article.imageAlt}
                fill
                priority
                quality={84}
                sizes="(max-width: 860px) 100vw, 48vw"
                src={`${assetBasePath}${article.image}`}
              />
              <figcaption>{article.imageCaption ?? "Концептуальная визуализация — не монтажная схема"}</figcaption>
            </figure> : null}
          </div>
        </header>

        <div className={`${styles.shell} ${styles.articleGrid}`}>
          <div className={styles.content}>
            {article.intro?.map(paragraph => <p className={styles.introParagraph} key={paragraph}>{paragraph}</p>)}
            {isRouteComparison ? <GuideRouteSchemes /> : null}
            {article.quickAnswer ? <section className={styles.quickAnswer} aria-labelledby="quick-answer-title">
              <p>Короткий ответ</p>
              <h2 id="quick-answer-title">С чего начать</h2>
              <p>{article.quickAnswer}</p>
            </section> : null}

            {article.slug === "komplekt-dymohoda-dlya-pechi" ? (
              <Link className={styles.scenarioLink} href="/solutions/pech">
                Подобрать дымоход для своей печи <ArrowRight size={18} aria-hidden />
              </Link>
            ) : null}

            {article.inlineImages?.length ? (
              <div className={styles.articlePhotos} aria-label="Фотографии с объекта">
                {article.inlineImages.map((image) => (
                  <figure className={styles.articlePhoto} key={image.src}>
                    <Image
                      alt={image.alt}
                      fill
                      loading="lazy"
                      quality={84}
                      sizes="(max-width: 760px) 100vw, 560px"
                      src={`${assetBasePath}${image.src}`}
                    />
                    <figcaption>{image.caption}</figcaption>
                  </figure>
                ))}
              </div>
            ) : null}

            {article.inputs?.length ? <section className={styles.section} aria-labelledby="source-data-title">
              <h2 id="source-data-title">Что подготовить для расчёта</h2>
              <ul className={styles.checkList}>
                {article.inputs.map((item) => (
                  <li key={item}><Check size={18} aria-hidden /><span>{item}</span></li>
                ))}
              </ul>
            </section> : null}

            {article.slug === "komplekt-dymohoda-dlya-pechi" ? <GuideProjectCosts /> : null}

            {article.sections.map((section) => (
              <section className={styles.section} id={section.id} key={section.title}>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph, index) => <Fragment key={paragraph}>
                  <p>{paragraph}</p>
                  {isRouteComparison && section.id === "kit-price-comparison" && index === 0 ? <GuideRoutePrices /> : null}
                </Fragment>)}
                {section.images?.length ? <GuideImagePair images={section.images} /> : null}
                {section.afterMediaParagraphs?.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                {section.links?.length ? <div className={styles.sectionLinks}>
                  {section.links.map(link => <Link href={link.href} key={link.href}>{link.label} <ArrowRight size={16} aria-hidden /></Link>)}
                </div> : null}
                {section.afterLinksParagraphs?.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                {section.items?.length ? (
                  <ul className={styles.articleList}>
                    {section.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                ) : null}
                {article.slug === "komplekt-dymohoda-dlya-pechi" && section.id === "stove-kit-composition" ? <GuideStoveActions /> : null}
              </section>
            ))}

            {isRouteComparison ? <GuideRouteActions /> : null}

            {article.estimateExample ? <GuideEstimateExample example={article.estimateExample} /> : null}

            <aside className={styles.safetyNote}>
              <AlertTriangle size={24} strokeWidth={1.8} aria-hidden />
              <div>
                <h2>Что проверить перед заказом</h2>
                <p>
                  Материал помогает собрать исходные данные и обсудить состав системы. Он не заменяет
                  паспорт отопителя, проект, документацию производителя дымохода и проверку узлов на
                  конкретном объекте.
                </p>
              </div>
            </aside>

            <section className={styles.sources} aria-labelledby="sources-title">
              <div className={styles.sourcesTitle}>
                <BookOpen size={23} strokeWidth={1.7} aria-hidden />
                <div>
                  <h2 id="sources-title">Источники</h2>
                </div>
              </div>
              <ol>
                {article.sources.map((source) => (
                  <li key={source.href}>
                    <a href={source.href} target="_blank" rel="noopener noreferrer">
                      {source.label} <ExternalLink size={14} aria-hidden />
                    </a>
                    <p>{source.note}</p>
                  </li>
                ))}
              </ol>
            </section>
            <section className={styles.section} aria-labelledby="guide-selection-title">
              <h2 id="guide-selection-title">Поможем подобрать комплект под вашу задачу</h2>
              <p>Оставьте заявку. Если есть модель печи, фотографии или готовый список деталей, приложите их — менеджер уточнит недостающие данные и поможет с подбором.</p>
              <details className={styles.selectionRequest}>
                <summary className={styles.primaryButton}>Помочь с подбором</summary>
                <LeadForm
                  source={`guide-selection:${article.slug}`}
                  configuration={`Подбор комплекта. Статья: ${article.title}`}
                  attachmentLabel="Фото, план или паспорт"
                  submitLabel="Отправить заявку на подбор"
                  compact
                />
              </details>
              {!usesQuickCalculation ? <Link className={styles.selectionCalculation} href={guideConfiguratorHref}>Рассчитать самостоятельно</Link> : null}
            </section>
          </div>

          <aside className={styles.sidebar} aria-label="Действия со статьёй">
            <div className={styles.sidebarCard}>
              <p className={styles.sidebarLabel}>Перейти от статьи к своему объекту</p>
              <h2>{usesQuickCalculation ? "Рассчитайте стоимость комплекта" : "Соберите маршрут по реальным размерам"}</h2>
              <p>{usesQuickCalculation ? "Выберите маршрут и параметры дымохода. Калькулятор покажет предварительную стоимость комплекта." : "Можно сохранить известные параметры, а неизвестные отметить для уточнения."}</p>
              <Link className={calculationClassName} href={calculationHref}>
                {usesQuickCalculation ? "Рассчитать стоимость" : "Открыть конфигуратор"} <ArrowRight size={18} aria-hidden />
              </Link>
              <Link className={styles.secondaryLink} href="/solutions">
                Сначала выбрать сценарий
              </Link>
            </div>
          </aside>
        </div>

        <section className={styles.relatedSection}>
          <div className={styles.shell}>
            <div className={styles.relatedHeading}>
              <p className={styles.eyebrow}>Продолжить разбираться</p>
              <h2>Связанные статьи</h2>
            </div>
            <div className={styles.relatedGrid}>
              {related.map((item) => (
                <Link className={styles.relatedCard} href={`/guides/${item.slug}`} key={item.slug}>
                  <span>{item.eyebrow}</span>
                  <h3>{item.shortTitle}</h3>
                  <p>{item.description}</p>
                  <strong>Читать <ArrowRight size={16} aria-hidden /></strong>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </article>
    </main>
  );
}
