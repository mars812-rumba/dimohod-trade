import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const categorySource = await readFile(
  new URL("../app/catalog/[category]/page.tsx", import.meta.url),
  "utf8",
);
const landingSource = await readFile(
  new URL("../app/catalog/[category]/[seoSlug]/page.tsx", import.meta.url),
  "utf8",
);
const sitemapSource = await readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8");
const viewSource = await readFile(
  new URL("../components/CatalogCategoryView.tsx", import.meta.url),
  "utf8",
);
const cardSource = await readFile(
  new URL("../components/CatalogProductCard.tsx", import.meta.url),
  "utf8",
);

test("dynamic filters stay noindex with a clean category canonical", () => {
  assert.match(categorySource, /alternates:\s*\{ canonical \}/u);
  assert.match(categorySource, /hasCatalogQuery\(query\)/u);
  assert.match(categorySource, /index:\s*false, follow:\s*true/u);
  assert.match(categorySource, /catalogCategoryPath\(category\.slug\)/u);
});

test("whitelist route is self-canonical and unknown slugs are real 404s", () => {
  assert.match(landingSource, /getCatalogSeoPage\(category, seoSlug\)/u);
  assert.match(landingSource, /if \(!page\) notFound\(\)/u);
  assert.match(landingSource, /catalogSeoPagePath\(page\)/u);
  assert.match(landingSource, /alternates:\s*\{ canonical \}/u);
});

test("sitemap includes only configured whitelist paths and no query URLs", () => {
  assert.match(sitemapSource, /catalogSeoPages/u);
  assert.match(sitemapSource, /catalogSeoPagePath/u);
  assert.doesNotMatch(sitemapSource, /searchParams|URLSearchParams/u);
});

test("server view renders breadcrumb and item-list JSON-LD from real results", () => {
  assert.match(viewSource, /"@type": "BreadcrumbList"/u);
  assert.match(viewSource, /"@type": "ItemList"/u);
  assert.match(viewSource, /productResponse\.items\.map/u);
  assert.match(viewSource, /productPublicPath\(product\.slug, product\)/u);
  assert.match(viewSource, /catalogFilteredHeading\(category\.name/u);
});

test("category pages render crawlable links to existing diameter pages", () => {
  assert.match(viewSource, /getProductSeoPages\(\)/u);
  assert.match(viewSource, /productPublicPath\(pageItem\.product_slug, pageItem\)/u);
  assert.match(viewSource, /<strong>Выберите диаметр<\/strong>/u);
  assert.match(viewSource, /<Link href=\{item\.href\}/u);
  assert.match(cardSource, /executionCountLabel\(product\.sku_count\)/u);
  assert.doesNotMatch(cardSource, /\{product\.sku_count\} SKU/u);
});
