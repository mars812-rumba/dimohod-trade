import Image from "next/image";
import Link from "next/link";
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

type GuideArticlePageProps = {
  article: GuideArticle;
};

export function GuideArticlePage({ article }: GuideArticlePageProps) {
  const assetBasePath = process.env.NEXT_BASE_PATH ?? "";
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
          <div className={`${styles.shell} ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>{article.eyebrow}</p>
              <h1>{article.title}</h1>
              <p className={styles.lead}>{article.summary}</p>
              <div className={styles.meta}>
                <span><Clock size={17} aria-hidden /> {article.readingTime}</span>
                <span>Обновлено 22 августа 2026</span>
              </div>
              <Link className={styles.primaryButton} href={guideConfiguratorHref}>
                Рассчитать свой комплект <ArrowRight size={18} aria-hidden />
              </Link>
            </div>
            <figure
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
            </figure>
          </div>
        </header>

        <div className={`${styles.shell} ${styles.articleGrid}`}>
          <div className={styles.content}>
            <section className={styles.quickAnswer} aria-labelledby="quick-answer-title">
              <p>Короткий ответ</p>
              <h2 id="quick-answer-title">С чего начать</h2>
              <p>{article.quickAnswer}</p>
            </section>

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

            <section className={styles.section} aria-labelledby="source-data-title">
              <h2 id="source-data-title">Что подготовить для расчёта</h2>
              <ul className={styles.checkList}>
                {article.inputs.map((item) => (
                  <li key={item}><Check size={18} aria-hidden /><span>{item}</span></li>
                ))}
              </ul>
            </section>

            {article.sections.map((section) => (
              <section className={styles.section} key={section.title}>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.items?.length ? (
                  <ul>
                    {section.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                ) : null}
              </section>
            ))}

            <aside className={styles.safetyNote}>
              <AlertTriangle size={24} strokeWidth={1.8} aria-hidden />
              <div>
                <h2>Граница предварительного расчёта</h2>
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
                  <p>Проверяемая основа</p>
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
          </div>

          <aside className={styles.sidebar} aria-label="Действия со статьёй">
            <div className={styles.sidebarCard}>
              <p className={styles.sidebarLabel}>Перейти от статьи к своему объекту</p>
              <h2>Соберите маршрут по реальным размерам</h2>
              <p>Можно сохранить известные параметры, а неизвестные отметить для уточнения.</p>
              <Link className={styles.primaryButton} href={guideConfiguratorHref}>
                Открыть конфигуратор <ArrowRight size={18} aria-hidden />
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
