import { IconArrowLeft as ArrowLeft, IconArrowRight as ArrowRight } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import {
  STOVES_PER_PAGE,
  stovePageCount,
  stovePagePath,
  stoves,
  stovesForPage,
} from "@/lib/stoves";
import styles from "@/app/pechi/page.module.css";

const assetBasePath = process.env.NEXT_BASE_PATH ?? "";

function paginationItems(currentPage: number) {
  const pages = Array.from(
    new Set([1, currentPage - 1, currentPage, currentPage + 1, stovePageCount]),
  )
    .filter((page) => page >= 1 && page <= stovePageCount)
    .sort((left, right) => left - right);

  return pages.flatMap<(number | string)>((page, index) => {
    const previous = pages[index - 1];
    return previous && page - previous > 1 ? [`gap-${previous}-${page}`, page] : [page];
  });
}

export function StoveCatalogPage({ page }: { page: number }) {
  const pageItems = stovesForPage(page);
  const firstItemNumber = (page - 1) * STOVES_PER_PAGE + 1;

  return (
    <main className={styles.main}>
      <div className={styles.shell}>
        <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
          <Link href="/">Главная</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">Печи</span>
        </nav>

        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Каталог оборудования</p>
            <h1>Печи для бани</h1>
          </div>
          <div className={styles.headerCopy}>
            <p>
              {stoves.length} моделей с названиями и фотографиями. Страница показывает только
              справочную карточку модели без технических характеристик.
            </p>
            <Link href="/configurator">
              Рассчитать дымоход <ArrowRight aria-hidden size={18} />
            </Link>
          </div>
        </header>

        <div className={styles.catalogMeta}>
          <p>Страница {page} из {stovePageCount}</p>
          <p>{pageItems.length} моделей на странице</p>
        </div>

        <section className={styles.grid} aria-label={`Печи для бани, страница ${page}`}>
          {pageItems.map((stove, index) => (
            <article className={styles.card} key={stove.id}>
              <div className={styles.imageStage}>
                <Image
                  alt={stove.name}
                  fill
                  priority={page === 1 && index < 3}
                  quality={78}
                  sizes="(max-width: 620px) calc(100vw - 28px), (max-width: 900px) 50vw, 380px"
                  src={`${assetBasePath}${stove.image}`}
                />
              </div>
              <div className={styles.cardBody}>
                <span>Модель {firstItemNumber + index}</span>
                <h2>{stove.name}</h2>
              </div>
            </article>
          ))}
        </section>

        <nav className={styles.pagination} aria-label="Страницы каталога печей">
          {page > 1 ? (
            <Link className={styles.paginationDirection} href={stovePagePath(page - 1)} rel="prev">
              <ArrowLeft aria-hidden size={17} /> Назад
            </Link>
          ) : (
            <span aria-hidden className={styles.paginationDirectionDisabled}>
              <ArrowLeft size={17} /> Назад
            </span>
          )}

          <div className={styles.paginationPages}>
            {paginationItems(page).map((item) =>
              typeof item === "string" ? (
                <span aria-hidden className={styles.paginationGap} key={item}>…</span>
              ) : (
                <Link
                  aria-current={item === page ? "page" : undefined}
                  className={item === page ? styles.paginationCurrent : undefined}
                  href={stovePagePath(item)}
                  key={item}
                >
                  {item}
                </Link>
              ),
            )}
          </div>

          {page < stovePageCount ? (
            <Link className={styles.paginationDirection} href={stovePagePath(page + 1)} rel="next">
              Вперёд <ArrowRight aria-hidden size={17} />
            </Link>
          ) : (
            <span aria-hidden className={styles.paginationDirectionDisabled}>
              Вперёд <ArrowRight size={17} />
            </span>
          )}
        </nav>
      </div>
    </main>
  );
}
