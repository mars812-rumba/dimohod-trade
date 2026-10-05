import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { guideArticles, guideArticleBySlug } from "./guideArticles.ts";

const textOf = article => article.sections.flatMap(section => [section.title, ...section.paragraphs, ...(section.items ?? [])]).join("\n");

test("starter content preserves five existing routes, images and valid related links", () => {
  assert.deepEqual(guideArticles.map(article => article.slug), ["dymohod-dlya-bani", "dymohod-cherez-stenu", "dymohod-cherez-krovlyu", "komplekt-dymohoda-dlya-pechi", "komplekt-s-troynikom-90"]);
  for (const article of guideArticles) {
    assert.ok(existsSync(new URL(`../public${article.image}`, import.meta.url)));
    assert.equal(new Set(article.sections.map(section => section.title)).size, article.sections.length);
    assert.ok(article.modifiedAt.startsWith("2026-10-05T"));
    assert.ok(Date.parse(article.modifiedAt) >= Date.parse(article.publishedAt));
    for (const slug of article.relatedSlugs) assert.ok(guideArticleBySlug[slug], slug);
    assert.doesNotMatch(textOf(article), /\b(?:SKU|BOM)\b|трубы должны отображаться|полезно показывать/);
  }
});

test("routes are compared without presenting hypothetical examples as completed jobs", () => {
  const wall = guideArticleBySlug["dymohod-cherez-stenu"];
  const roof = guideArticleBySlug["dymohod-cherez-krovlyu"];
  assert.ok(wall.relatedSlugs.includes(roof.slug));
  assert.ok(roof.relatedSlugs.includes(wall.slug));
  const comparison = wall.sections.find(section => section.title.startsWith("Через стену или кровлю"));
  assert.equal(comparison.paragraphs.length, 8);
  assert.match(textOf(wall), /Условный пример/);
  assert.match(textOf(wall), /не описывают наши выполненные объекты/);
  assert.match(textOf(wall), /Коаксиальные системы газовых котлов — другой сценарий/);
  assert.doesNotMatch(textOf(wall), /всегда дешевле|гарантированно подходит/);
});

test("buyer's checks separate accessories and hidden inclusions from the chimney itself", () => {
  assert.match(textOf(guideArticleBySlug["dymohod-dlya-bani"]), /не стоит считать включёнными/);
  const stove = guideArticleBySlug["komplekt-dymohoda-dlya-pechi"];
  assert.equal(stove.sections.find(section => section.title === "Логика состава комплекта").paragraphs.length, 8);
  const tee = guideArticleBySlug["komplekt-s-troynikom-90"];
  assert.match(textOf(tee), /Одинаковый диаметр не подтверждает совместимость/);
});

test("wall, roof and tee articles link only to official sources, not competitors", () => {
  for (const slug of ["dymohod-cherez-stenu", "dymohod-cherez-krovlyu", "komplekt-s-troynikom-90"]) {
    const article = guideArticleBySlug[slug];
    assert.equal(article.sources.length, 3);
    for (const source of article.sources) {
      const host = new URL(source.href).hostname;
      assert.ok(host.endsWith(".mchs.gov.ru") || host === "publication.pravo.gov.ru", host);
    }
    assert.doesNotMatch(JSON.stringify(article), /ferrum|вулкан|dymohodvulkan/i);
  }
});
