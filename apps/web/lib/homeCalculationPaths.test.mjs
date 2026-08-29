import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const pageStyles = readFileSync(new URL("../app/page.module.css", import.meta.url), "utf8");
const header = readFileSync(new URL("../components/SiteHeader.tsx", import.meta.url), "utf8");
const hero = readFileSync(new URL("../components/HomeHeroCarousel.tsx", import.meta.url), "utf8");

test("homepage sends measurement entry points to one format choice", () => {
  assert.match(page, /<span>Полный замер<\/span>\s*<span>для точной сметы<\/span>/);
  assert.match(page, /Начать замер/);
  assert.match(page, /href="\/raschet"/);
  assert.doesNotMatch(page, /Сначала выберите формат/);
  assert.doesNotMatch(page, /Готовите реальный заказ\? Укажите размеры/);
  assert.doesNotMatch(page, /<HomeQuickEstimate/);
  assert.doesNotMatch(page, /<HomeGuidedShowcase/);
  assert.match(page, /LucideGauge/);
  assert.match(page, /LucideRuler/);
  assert.match(page, /Быстрый расчёт или глубокий замер/);
  assert.match(page, /На следующем экране подскажем, какой путь подойдёт именно вам/);
  assert.match(page, /Для замера понадобится рулетка 5–10 м — больше ничего готовить не нужно/);
  assert.match(
    page,
    /<h2 id="home-benefits-title">\s*<span>Полный замер<\/span>\s*<span>для точной сметы<\/span>\s*<\/h2>\s*<p className=\{styles\.benefitsIntroNote\}>\s*Для замера понадобится рулетка 5–10 м/,
  );
  assert.doesNotMatch(page, /calculationEquipmentNote/);
  assert.match(pageStyles, /\.calculationFormatCta[\s\S]*border-radius: 30px/);
});

test("positioning promise replaces the old comparison and leads into measurement choice", () => {
  const positioningStart = page.indexOf("positioningSection");
  const measurementStart = page.indexOf('id="measurement-choice"');

  assert.ok(positioningStart > -1);
  assert.ok(measurementStart > positioningStart);
  assert.match(page, /Мы продаём не трубы — мы продаём дымоход, который точно встанет/);
  assert.match(page, /Проверяемая совместимость/);
  assert.match(page, /Единая система/);
  assert.match(page, /Проверка перед заказом/);
  assert.match(page, /className=\{styles\.positioningLink\} href="#measurement-choice"/);
  assert.doesNotMatch(page, /Трубу купить легко\. Сложнее собрать правильный дымоход/);
  assert.equal(page.match(/Не просто трубы/g)?.length, 1);
});

test("hero and navigation open the same format choice", () => {
  assert.match(hero, /href="\/raschet"/);
  assert.match(hero, /Начать замер/);
  assert.match(header, /header-configurator" href="\/raschet"/);
  assert.match(header, /Выберите быстрый расчёт или глубокий замер/);
});

const choicePage = readFileSync(new URL("../app/raschet/page.tsx", import.meta.url), "utf8");
const quickPage = readFileSync(new URL("../app/bystryy-raschet/page.tsx", import.meta.url), "utf8");

test("format choice routes to standalone quick and deep flows", () => {
  assert.match(choicePage, /href="\/bystryy-raschet"/);
  assert.match(choicePage, /href="\/zamery\?edit=1"/);
  assert.match(choicePage, /Возможное отклонение — ±30%/);
  assert.match(quickPage, /<HomeQuickEstimate/);
  assert.match(quickPage, /href="\/raschet"/);
});
