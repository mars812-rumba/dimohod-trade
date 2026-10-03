import Link from "next/link";
import { notFound } from "next/navigation";
import {
  IconAdjustmentsHorizontal as SlidersHorizontal,
  IconArrowLeft as ArrowLeft,
  IconArrowRight as ArrowRight,
  IconChevronDown as ChevronDown,
  IconX as X,
} from "@tabler/icons-react";
import {
  CatalogProductCard,
  type CatalogDiameterLink,
} from "@/components/CatalogProductCard";
import { CatalogVariantFilters } from "@/components/CatalogVariantFilters";
import {
  catalogCategoryPath,
  catalogFilteredHeading,
  catalogFilterPath,
  type CatalogFilters,
} from "@/lib/catalogFilters";
import {
  catalogSeoPagePath,
  catalogSeoPagesForCategory,
  type CatalogSeoPage,
} from "@/lib/catalogSeoPages";
import {
  getProductFilters,
  getProductSeoPages,
  getProducts,
  type CategoryNode,
  type ProductSeoPage,
} from "@/lib/api";
import { productPublicPath } from "@/lib/productUrls";
import { filterVariantItems } from "@/lib/variantSelection";
import { sandwichCategoryContent } from "@/lib/commercialContent";

const PAGE_SIZE = 48;
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dimohod-trade.pro";
const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type CatalogCategoryViewProps = {
  category: CategoryNode;
  filters: CatalogFilters;
  hasQuery?: boolean;
  seoPage?: CatalogSeoPage | null;
};

function absoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(`${appBasePath}${path}`, appUrl).toString();
}

function selectedFilter(value: string | undefined, options: Array<{ value: string }>) {
  const requested = value?.trim();
  return requested && options.some((option) => option.value === requested) ? requested : undefined;
}

function selectedOrFirst(value: string | undefined, options: Array<{ value: string }>) {
  return selectedFilter(value, options) ?? options[0]?.value;
}

function compoundParts(value: string | undefined, size: number) {
  const parts = value?.split("|") ?? [];
  return Array.from({ length: size }, (_, index) => parts[index] || undefined);
}

function combinationValue(
  combination: Awaited<ReturnType<typeof getProductFilters>>["variant_combinations"][number],
  key: string,
) {
  const value = combination[key as keyof typeof combination];
  return typeof value === "string" ? value : null;
}

function isPipeCategory(category: CategoryNode) {
  return /(?:труб|trub)/iu.test(`${category.name} ${category.slug}`);
}

function diameterPageLabel(page: ProductSeoPage) {
  if (page.diameter_mm !== null && page.outer_diameter_mm !== null) {
    return `${page.diameter_mm}/${page.outer_diameter_mm}`;
  }
  const diameter = page.diameter_mm ?? page.outer_diameter_mm;
  return diameter === null ? null : String(diameter);
}

export async function CatalogCategoryView({
  category,
  filters: query,
  hasQuery = false,
  seoPage = null,
}: CatalogCategoryViewProps) {
  const availableFilters = await getProductFilters(category.slug);
  const requestedDiameter = query.diameter;
  const appliedDiameter = availableFilters.diameters.some((option) => option.value === requestedDiameter)
    ? requestedDiameter
    : undefined;
  const appliedInnerPipe = selectedFilter(query.inner_pipe, availableFilters.inner_pipes);
  const appliedOuterPipe = selectedFilter(query.outer_pipe, availableFilters.outer_pipes);
  const diameter = appliedDiameter ?? availableFilters.diameters[0]?.value;
  let innerPipe = selectedOrFirst(appliedInnerPipe, availableFilters.inner_pipes);
  let outerPipe = availableFilters.outer_pipes.length
    ? selectedOrFirst(appliedOuterPipe, availableFilters.outer_pipes)
    : undefined;
  const execution = selectedFilter(query.execution, availableFilters.executions);
  const defaultLength = isPipeCategory(category)
    && availableFilters.lengths.some((option) => option.value === "1000")
    ? "1000"
    : undefined;
  const allLengthsRequested = query.length === "all";
  const length = allLengthsRequested
    ? undefined
    : selectedFilter(query.length, availableFilters.lengths)
      ?? (query.length ? undefined : defaultLength);
  let innerThickness = selectedFilter(query.inner_thickness, availableFilters.wall_thicknesses);
  const diameterCombinations = filterVariantItems(
    availableFilters.variant_combinations,
    { diameter },
    combinationValue,
  );
  if (
    diameterCombinations.length
    && !diameterCombinations.some((combination) => combination.inner_pipe === innerPipe)
  ) {
    innerPipe = diameterCombinations[0].inner_pipe;
  }
  const innerCombinations = filterVariantItems(
    diameterCombinations,
    { inner_pipe: innerPipe },
    combinationValue,
  );
  if (
    innerThickness
    && !innerCombinations.some((combination) => combination.inner_thickness === innerThickness)
  ) {
    innerThickness = undefined;
  }
  const matchingPipeCombinations = filterVariantItems(
    innerCombinations,
    { inner_thickness: innerThickness },
    combinationValue,
  );
  if (
    matchingPipeCombinations.length
    && !matchingPipeCombinations.some((combination) => combination.outer_pipe === outerPipe)
  ) {
    outerPipe = matchingPipeCombinations[0].outer_pipe;
  }

  const [material, steel] = compoundParts(appliedInnerPipe, 2);
  const [outerMaterial, outerSteel, outerThickness] = compoundParts(appliedOuterPipe, 3);
  const [preferredMaterial, preferredSteel] = compoundParts(innerPipe, 2);
  const [preferredOuterMaterial, preferredOuterSteel] = compoundParts(outerPipe, 3);
  const [angle, insulation] = compoundParts(execution, 2);
  const page = Number(query.page ?? "1");
  const offset = (page - 1) * PAGE_SIZE;
  const currentFilters: CatalogFilters = {
    diameter: appliedDiameter,
    inner_pipe: appliedInnerPipe,
    inner_thickness: innerThickness,
    outer_pipe: appliedOuterPipe,
    execution,
    length: allLengthsRequested ? "all" : length,
    page: query.page,
  };
  const extraFacets = [{
    name: "length",
    label: "Длина L",
    value: allLengthsRequested ? "all" : length,
    options: availableFilters.lengths,
    allValue: defaultLength ? "all" : "",
  }];

  const [productResponse, productSeoPages] = await Promise.all([
    getProducts({
      limit: PAGE_SIZE,
      offset,
      category: category.slug,
      diameter: appliedDiameter,
      steelGrade: steel,
      material,
      outerSteelGrade: outerSteel,
      outerMaterial,
      length,
      wallThickness: innerThickness,
      outerWallThickness: outerThickness,
      angle,
      insulation,
      preferredDiameter: diameter,
      preferredSteelGrade: preferredSteel,
      preferredMaterial,
      preferredOuterSteelGrade: preferredOuterSteel,
      preferredOuterMaterial,
    }),
    getProductSeoPages(),
  ]);
  const totalPages = Math.max(1, Math.ceil(productResponse.total / PAGE_SIZE));
  if (productResponse.total > 0 && page > totalPages) notFound();

  const baseCategoryPath = catalogCategoryPath(category.slug);
  const canonicalPath = seoPage ? catalogSeoPagePath(seoPage) : baseCategoryPath;
  const canonicalUrl = absoluteUrl(canonicalPath);
  const breadcrumbItems = [
    { name: "Главная", path: "/" },
    { name: "Каталог", path: "/catalog" },
    { name: category.name, path: baseCategoryPath },
    ...(seoPage ? [{ name: seoPage.h1, path: canonicalPath }] : []),
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbItems.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: absoluteUrl(item.path),
        })),
      },
      ...(productResponse.items.length ? [{
        "@type": "ItemList",
        url: canonicalUrl,
        numberOfItems: productResponse.total,
        itemListElement: productResponse.items.map((product, index) => ({
          "@type": "ListItem",
          position: offset + index + 1,
          name: product.name,
          url: absoluteUrl(productPublicPath(product.slug, product)),
        })),
      }] : []),
    ],
  };
  const relatedSeoPages = catalogSeoPagesForCategory(category.slug);
  const visibleProductSlugs = new Set(productResponse.items.map((product) => product.slug));
  const diameterPagesByProduct = new Map<string, CatalogDiameterLink[]>();
  productSeoPages
    .filter((pageItem) => visibleProductSlugs.has(pageItem.product_slug))
    .sort((left, right) => (
      (left.diameter_mm ?? left.outer_diameter_mm ?? 0)
      - (right.diameter_mm ?? right.outer_diameter_mm ?? 0)
      || (left.outer_diameter_mm ?? 0) - (right.outer_diameter_mm ?? 0)
    ))
    .forEach((pageItem) => {
      const label = diameterPageLabel(pageItem);
      if (!label) return;
      const href = productPublicPath(pageItem.product_slug, pageItem);
      const links = diameterPagesByProduct.get(pageItem.product_slug) ?? [];
      if (!links.some((item) => item.href === href)) {
        links.push({ href, label });
        diameterPagesByProduct.set(pageItem.product_slug, links);
      }
    });
  const categoryHeading = catalogFilteredHeading(category.name, {
    diameter: appliedDiameter,
    inner_pipe: appliedInnerPipe,
    inner_thickness: innerThickness,
    outer_pipe: appliedOuterPipe,
  });
  const showSandwichContent = category.slug === "sendvich-truby" && !hasQuery && !seoPage;
  const intro = seoPage?.intro ?? (showSandwichContent ? sandwichCategoryContent.intro : category.description);

  return (
    <>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        type="application/ld+json"
      />
      <main className="page catalog-page">
        <section className="section catalog-category-page">
          <nav className="breadcrumb" aria-label="Навигация">
            <Link href="/">Главная</Link><span aria-hidden>/</span>
            <Link href="/catalog">Каталог</Link><span aria-hidden>/</span>
            {seoPage ? (
              <>
                <Link href={baseCategoryPath}>{category.name}</Link><span aria-hidden>/</span>
                <span>{seoPage.h1}</span>
              </>
            ) : <span>{category.name}</span>}
          </nav>

          <div className="catalog-category-heading">
            <div>
              <p className="eyebrow">{seoPage ? "Подборка" : "Категория"}</p>
              <h1 className="product-title">{seoPage?.h1 ?? categoryHeading}</h1>
            </div>
            <div className="catalog-result-count">
              <strong>{productResponse.total}</strong><span>семейств найдено</span>
            </div>
          </div>
          {intro ? (
            <p className="lead catalog-category-description">{intro}</p>
          ) : null}

          {relatedSeoPages.length ? (
            <nav className="catalog-seo-links" aria-label="Популярные подборки">
              <strong>Популярные подборки</strong>
              <div>
                {relatedSeoPages.map((pageItem) => (
                  <Link href={catalogSeoPagePath(pageItem)} key={pageItem.slug}>{pageItem.h1}</Link>
                ))}
              </div>
            </nav>
          ) : null}

          <details className="catalog-mobile-filter" open>
            <summary>
              <span><SlidersHorizontal size={17} /> Фильтры</span>
              <ChevronDown aria-hidden="true" className="catalog-filter-chevron" size={17} />
            </summary>
            <form
              action={`${appBasePath}${baseCategoryPath}`}
              className="catalog-variant-filters"
              key={Object.values(currentFilters).map((value) => value ?? "").join("|")}
              method="get"
            >
              <CatalogVariantFilters
                diameter={diameter}
                diameters={availableFilters.diameters}
                execution={execution}
                executions={availableFilters.executions}
                facets={extraFacets}
                innerPipe={innerPipe}
                innerPipes={availableFilters.inner_pipes}
                innerThickness={innerThickness}
                innerThicknesses={availableFilters.wall_thicknesses}
                outerPipe={outerPipe}
                outerPipes={availableFilters.outer_pipes}
                variantCombinations={availableFilters.variant_combinations}
              />
              {hasQuery || seoPage ? (
                <Link className="catalog-filter-reset" href={baseCategoryPath}>
                  <X size={14} /> Сбросить
                </Link>
              ) : null}
            </form>
          </details>

          {productResponse.items.length ? (
            <div className="catalog-products-grid">
              {productResponse.items.map((product) => (
                <CatalogProductCard
                  diameterLinks={diameterPagesByProduct.get(product.slug)}
                  key={product.id}
                  product={product}
                />
              ))}
            </div>
          ) : <div className="state-empty">По выбранным параметрам ничего не найдено.</div>}

          <nav className="catalog-pagination" aria-label="Пагинация категории">
            {page > 1 ? (
              <Link
                className="button secondary"
                href={catalogFilterPath(category.slug, {
                  ...currentFilters,
                  page: page > 2 ? String(page - 1) : undefined,
                })}
              >
                <ArrowLeft size={16} /> Назад
              </Link>
            ) : <span />}
            <span>Страница {page} из {totalPages}</span>
            {page < totalPages ? (
              <Link
                className="button"
                href={catalogFilterPath(category.slug, {
                  ...currentFilters,
                  page: String(page + 1),
                })}
              >
                Дальше <ArrowRight size={16} />
              </Link>
            ) : <span />}
          </nav>
          {showSandwichContent ? (
            <section className="catalog-selection-help" aria-labelledby="sandwich-selection-title">
              <h2 id="sandwich-selection-title">Что проверить перед покупкой сэндвич-трубы</h2>
              <p>Обозначение d/D показывает внутренний и наружный диаметры. Сверьте параметры подключения с паспортом отопителя; затем выберите длину и исполнение трубы.</p>
              <dl>
                <div><dt>Диаметры d/D в каталоге</dt><dd>{availableFilters.diameters.map((item) => item.label).join(", ") || "Уточняются"}</dd></div>
                <div><dt>Длины</dt><dd>{availableFilters.lengths.map((item) => item.label).join(", ") || "Уточняются"}</dd></div>
                <div><dt>Толщина внутренней трубы</dt><dd>{availableFilters.wall_thicknesses.map((item) => item.label).join(", ") || "Уточняется"}</dd></div>
              </dl>
              <p>Для полного комплекта нужны параметры отопителя, маршрут и размеры объекта. Подберите совместимые элементы и рассчитайте полный комплект дымохода в конфигураторе.</p>
              <nav aria-label="Маршрут и расчёт дымохода">
                <Link href="/configurator">Рассчитать полный комплект</Link>
                <Link href="/guides/dymohod-cherez-stenu">Маршрут через стену</Link>
                <Link href="/guides/dymohod-cherez-krovlyu">Маршрут через кровлю</Link>
                <Link href="/solutions/banya">Комплект для бани</Link>
                <Link href="/solutions/dom">Комплект для дома</Link>
                <Link href="/solutions/pech">Комплект для печи</Link>
              </nav>
            </section>
          ) : null}
        </section>
      </main>
    </>
  );
}
