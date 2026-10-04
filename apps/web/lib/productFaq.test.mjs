import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { productFaqItems, productFaqTitle } from "./productFaq.ts";
import catalog from "./productFaqCatalog.json" with { type: "json" };

const faqSource = readFileSync(new URL("./productFaq.ts", import.meta.url), "utf8");
const productSource = readFileSync(new URL("../components/ProductExperience.tsx", import.meta.url), "utf8");
const pageSource = readFileSync(new URL("../app/product/[slug]/page.tsx", import.meta.url), "utf8");

const catalogKinds = [
  "декоративная_юбка",
  "заглушка",
  "изоляция",
  "конденсатоотвод",
  "консоль",
  "крепеж",
  "оголовок",
  "опорная_площадка",
  "отвод",
  "проходной_узел",
  "ревизия",
  "тройник",
  "труба",
  "фланец",
  "четверник",
  "шибер",
];

test("every active catalog product kind has a dedicated FAQ fact", () => {
  catalogKinds.forEach((kind) => {
    assert.match(faqSource, new RegExp(`\\n  ${kind}: \\{`));
  });
});

test("product FAQ is derived from the family and selected SKU", () => {
  assert.match(productSource, /productFaqItems\(product, activeSku\)/);
  assert.doesNotMatch(productSource, /const faqItems = \[/);
  assert.match(faqSource, /product\.extra_attributes\.faq/);
  assert.match(faqSource, /product\.skus/);
});

test("product pages publish the visible FAQ as structured data", () => {
  assert.match(pageSource, /"@type": "FAQPage"/);
  assert.match(pageSource, /acceptedAnswer:/);
  assert.match(pageSource, /productFaqItems\(product, sku\)/);
});

const family = (set) => {
  const [id, entry] = Object.entries(catalog).find(([, value]) => value.set === set);
  return { id, name: entry.title, slug: entry.slug, extra_attributes: {}, skus: [] };
};
const sku = (overrides = {}) => ({
  id: "test-sku", article: "TEST", diameter_mm: null, outer_diameter_mm: null,
  length_mm: null, material: null, steel_grade: null, wall_thickness_mm: null,
  insulation_mm: null, attributes: {}, ...overrides,
});

test("36 explicitly mapped family IDs contain 148 stable, nonempty questions", () => {
  assert.equal(Object.keys(catalog).length, 36);
  assert.equal(Object.values(catalog).reduce((count, entry) => count + entry.items.length, 0), 148);
  const ids = new Set();
  for (const [id, entry] of Object.entries(catalog)) {
    assert.match(id, /^[a-f0-9-]{36}$/);
    assert.equal(entry.items.length, ["F01", "F02"].includes(entry.set) ? 6 : 4);
    for (const item of entry.items) {
      assert.ok(item.q.trim() && item.a.trim());
      assert.ok(!ids.has(item.id));
      ids.add(item.id);
      assert.doesNotMatch(item.a, /\{\w+\}|https?:\/\/|\[S\d+\]/);
    }
  }
});

test("family selection uses identity, not a substring in the name", () => {
  const product = family("F26");
  product.name = "Другое редакционное название";
  const faq = productFaqItems(product, null);
  assert.equal(faq.length, 4);
  assert.match(faq[0].a, /переходному элементу/);
  assert.match(productFaqTitle(product), /Сэндвич-заглушка/);
});

test("diameter question is replaced and refreshes together with selected SKU", () => {
  const product = family("F02");
  for (const [inner, outer] of [[100, 200], [150, 250]]) {
    const faq = productFaqItems(product, sku({ diameter_mm: inner, outer_diameter_mm: outer, length_mm: 1000 }));
    assert.equal(faq.length, 7);
    assert.equal(faq.filter((item) => item.id.endsWith("P01")).length, 1);
    assert.ok(!faq.some((item) => item.id === "F02-Q1"));
    assert.match(faq[0].a, new RegExp(`канал — ${inner} мм, наружный кожух — ${outer} мм`));
  }
});

test("missing, invalid and zero dimensions do not render parameter questions", () => {
  for (const length of [undefined, null, 0, "", "NaN", -5]) {
    assert.equal(productFaqItems(family("F01"), sku({ length_mm: length })).length, 6);
  }
  const faq = productFaqItems(family("F02"), sku({ diameter_mm: 150, outer_diameter_mm: 100 }));
  assert.equal(faq.length, 6);
});

test("materials update and never assign steel grades to galvanization", () => {
  const product = family("F19");
  const stainless = sku({ material: "нержавеющая сталь", steel_grade: "AISI 304", wall_thickness_mm: "0.5", attributes: { outer_material: "нержавеющая сталь", outer_steel_grade: "AISI 430" } });
  const galvanized = sku({ ...stainless, material: "оцинковка", attributes: { outer_material: "оцинковка", outer_steel_grade: "AISI 430" } });
  const first = productFaqItems(product, stainless).find((item) => item.id.endsWith("P03"));
  const second = productFaqItems(product, galvanized).find((item) => item.id.endsWith("P03"));
  assert.match(first.a, /AISI 304, 0,5 мм/);
  assert.doesNotMatch(second.a, /AISI/);
  assert.match(second.a, /оцинковка/);
});

test("accessories do not receive tube dimensions or material questions", () => {
  const data = sku({ diameter_mm: 150, outer_diameter_mm: 250, length_mm: 1000, material: "сталь", attributes: { outer_material: "сталь", diameter_range: "до D300" } });
  for (const set of ["F12", "F13", "F30", "F31", "F35", "F36"]) {
    assert.equal(productFaqItems(family(set), data).length, 4);
  }
});

test("insulation and mounting length are never inferred from geometry", () => {
  const faq = productFaqItems(family("F01"), sku({ length_mm: 1000 }));
  assert.doesNotMatch(faq.at(-1).a, /Монтажная длина этого исполнения/);
  const sandwich = productFaqItems(family("F19"), sku({ diameter_mm: 150, outer_diameter_mm: 250 }));
  assert.ok(!sandwich.some((item) => item.id.endsWith("P04")));
});

test("manual editor FAQ retains priority", () => {
  const product = family("F01");
  product.extra_attributes.faq = [{ question: "Наш вопрос", answer: "Наш ответ" }];
  assert.deepEqual(productFaqItems(product, null), [{ q: "Наш вопрос", a: "Наш ответ" }]);
});

test("telescopic console is wall mounted according to the owner's clarification", () => {
  const faq = productFaqItems(family("F12"), null);
  assert.match(faq[0].a, /крепится к стене/);
  assert.match(faq[2].a, /состояние стены/);
  assert.ok(faq.every((item) => !/напольн/i.test(item.a)));
});

test("native product accordion includes answers before interaction", () => {
  assert.match(productSource, /<details className="faq-item product-faq-item">/);
  assert.match(productSource, /<summary className="faq-trigger">/);
  assert.match(productSource, /<div className="faq-body">\{a\}<\/div>/);
  assert.doesNotMatch(productSource, /open \? <div className="faq-body"/);
});
