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
    assert.ok(Date.parse(article.modifiedAt) >= Date.parse(article.publishedAt));
    for (const slug of article.relatedSlugs) assert.ok(guideArticleBySlug[slug], slug);
    assert.doesNotMatch(textOf(article), /\b(?:SKU|BOM)\b|трубы должны отображаться|полезно показывать/);
  }
});

test("route comparison uses the owner's real Lampovo case and links to its complete estimate", () => {
  const wall = guideArticleBySlug["dymohod-cherez-stenu"];
  const roof = guideArticleBySlug["dymohod-cherez-krovlyu"];
  assert.ok(wall.relatedSlugs.includes(roof.slug));
  assert.ok(roof.relatedSlugs.includes(wall.slug));
  const project = wall.sections.find(section => section.id === "lampovo");
  assert.match(project.paragraphs.join(" "), /Dacha 2 с конфорками/);
  assert.equal(project.images.length, 2);
  for (const image of project.images) assert.ok(existsSync(new URL(`../public${image.src}`, import.meta.url)));
  assert.equal(project.links[0].href, "/guides/komplekt-dymohoda-dlya-pechi#project-cost-10");
  assert.match(project.afterMediaParagraphs.join(" "), /Уточните, можно ли использовать такой кожух с вашей печью и дымоходом/);
  assert.doesNotMatch(textOf(wall), /Условный пример|не описывают наши выполненные объекты/);
  assert.doesNotMatch(textOf(wall), /всегда дешевле|гарантированно подходит/);
});

test("buyer's checks separate accessories and hidden inclusions from the chimney itself", () => {
  assert.match(textOf(guideArticleBySlug["dymohod-dlya-bani"]), /не стоит считать включёнными/);
  const stove = guideArticleBySlug["komplekt-dymohoda-dlya-pechi"];
  const composition = stove.sections.find(section => section.items?.length);
  assert.ok(composition, "kit inclusions must be a scannable list");
  const inclusions = composition.items.join("\n");
  for (const subject of [/подключения/, /Прямые трубы/, /Узлы прохода/, /Опоры и крепления/, /Завершение/, /доставка/, /монтаж/]) {
    assert.match(inclusions, subject);
  }
  const tee = guideArticleBySlug["komplekt-s-troynikom-90"];
  assert.match(textOf(tee), /Одинаковый диаметр не подтверждает совместимость/);
});

test("guides omit generic source lists and unrelated equipment manuals", () => {
  for (const article of guideArticles) {
    assert.equal(article.sources.length, 0);
    assert.doesNotMatch(JSON.stringify(article), /mchs\.gov\.ru|publication\.pravo\.gov\.ru|tmf-shop\.ru|lanordica-extraflame\.com/);
    assert.doesNotMatch(JSON.stringify(article), /ferrum|вулкан|dymohodvulkan/i);
  }
});
