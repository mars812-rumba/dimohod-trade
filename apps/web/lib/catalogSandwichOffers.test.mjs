import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const offers = read("../components/CatalogSandwichOffers.tsx");
const category = read("../components/CatalogCategoryView.tsx");

test("pilot uses actual filtered offers and exact selected variant URLs, not fixed prices", () => {
  assert.match(offers, /category: "sendvich-truby"/);
  assert.match(offers, /ordered\.includes\(d\)/);
  assert.match(offers, /\.slice\(0, 6\)/);
  assert.match(offers, /\.\.\.selection/);
  assert.match(offers, /productSelectionPath\(item\.slug, item, item\.selected_sku\)/);
  assert.match(offers, /format\(Number\(item\.price_rub\)\)/);
  assert.match(offers, /Number\.isFinite/);
  assert.match(offers, /\.catch\(\(\) => null\)/);
  assert.doesNotMatch(offers, /use client|useEffect|В наличии|лучшее|популярные|хит продаж/i);
});

test("table labels both contours and distinguishes unit price from the kit", () => {
  for (const label of ["Внутренняя труба", "Наружная труба", "Цена за штуку", "не за комплект дымохода"])
    assert.ok(offers.includes(label));
  assert.match(offers, /scope="col"/);
  assert.match(offers, /scope="row"/);
  assert.match(offers, /tabIndex=\{0\}/);
  assert.match(offers, /href="\/#send-materials"/);
  assert.match(read("../app/page.tsx"), /id="send-materials"/);
});

test("pilot stays on the base sandwich category, retaining filters and existing cards", () => {
  assert.match(category, /category\.slug === "sendvich-truby" && !hasQuery && !seoPage/);
  assert.match(category, /showSandwichContent \? \(\s*<CatalogSandwichOffers/);
  assert.match(category, /<CatalogVariantFilters/);
  assert.match(category, /<CatalogProductCard/);
  assert.match(category, /"sandwich-filters" : undefined/);
});
