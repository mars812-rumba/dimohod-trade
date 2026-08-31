import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

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
