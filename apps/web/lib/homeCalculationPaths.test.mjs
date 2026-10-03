import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const pageStyles = readFileSync(new URL("../app/page.module.css", import.meta.url), "utf8");
const header = readFileSync(new URL("../components/SiteHeader.tsx", import.meta.url), "utf8");
const hero = readFileSync(new URL("../components/HomeHeroCarousel.tsx", import.meta.url), "utf8");

test("homepage sends measurement entry points to one format choice", () => {
  assert.match(page, /<span>Узнайте ориентировочную стоимость<\/span>\s*<span>или подготовьте точную смету<\/span>/);
  assert.match(page, /Начать расчёт/);
  assert.match(page, /href="\/raschet"/);
  assert.doesNotMatch(page, /Сначала выберите формат/);
  assert.doesNotMatch(page, /Готовите реальный заказ\? Укажите размеры/);
  assert.doesNotMatch(page, /<HomeQuickEstimate/);
  assert.doesNotMatch(page, /<HomeGuidedShowcase/);
  assert.match(page, /LucideGauge/);
  assert.match(page, /LucideRuler/);
  assert.match(page, /Два варианта под вашу задачу/);
  assert.match(page, /Получите ориентировочную стоимость или пройдите полный замер для сметы/);
  assert.match(page, /Для быстрого расчёта достаточно основных параметров/);
  assert.match(
    page,
    /<h2 id="home-benefits-title">\s*<span>Узнайте ориентировочную стоимость<\/span>\s*<span>или подготовьте точную смету<\/span>/,
  );
  assert.doesNotMatch(page, /calculationEquipmentNote/);
  assert.match(pageStyles, /\.calculationFormatCta[\s\S]*border-radius: 30px/);
});

test("positioning promise replaces the old comparison and leads into measurement choice", () => {
  const positioningStart = page.indexOf("positioningSection");
  const measurementStart = page.indexOf('id="measurement-choice"');

  assert.ok(positioningStart > -1);
  assert.ok(measurementStart > positioningStart);
  assert.match(page, /Получите комплект дымохода под ваш отопитель и маршрут/);
  assert.match(page, /Не подбираете детали вручную/);
  assert.match(page, /Получаете схему монтажа/);
  assert.match(page, /Видите состав и предварительную стоимость/);
  assert.match(page, /className=\{styles\.positioningLink\} href="#measurement-choice"/);
  assert.doesNotMatch(page, /Трубу купить легко\. Сложнее собрать правильный дымоход/);
  assert.doesNotMatch(page, /Мы продаём не трубы/);
});

test("hero opens the quick estimate while navigation keeps the format choice", () => {
  assert.match(hero, /href="\/bystryy-raschet"/);
  assert.match(hero, /Рассчитать комплект/);
  assert.match(hero, /Перейти к быстрому расчёту/);
  assert.match(header, /header-configurator" href="\/raschet"/);
  assert.match(header, /<span>Калькулятор<\/span>/);
});

const choicePage = readFileSync(new URL("../app/raschet/page.tsx", import.meta.url), "utf8");
const quickPage = readFileSync(new URL("../app/bystryy-raschet/page.tsx", import.meta.url), "utf8");

test("format choice routes to standalone quick and deep flows", () => {
  assert.match(choicePage, /href="\/bystryy-raschet"/);
  assert.match(choicePage, /href="\/zamery\?edit=1"/);
  assert.doesNotMatch(choicePage, /±30%/);
  assert.match(choicePage, /Перед заказом менеджер проверит состав и итоговую стоимость/);
  assert.match(quickPage, /<HomeQuickEstimate/);
  assert.match(quickPage, /href="\/raschet"/);
});

test("quick estimate is first in DOM order and has the primary cost action", () => {
  assert.ok(choicePage.indexOf('className={styles.quickChoice}') < choicePage.indexOf('className={styles.exactChoice}'));
  assert.match(choicePage, /className=\{styles\.primaryAction\} href="\/bystryy-raschet">\s*Рассчитать стоимость/);
  assert.match(choicePage, /className=\{styles\.secondaryAction\} href="\/zamery\?edit=1"/);
  assert.match(choicePage, /Быстрый расчёт стоимости/);
  assert.match(choicePage, /Результат без отправки контактов/);
  assert.doesNotMatch(choicePage, /Прикинуть бюджет|перенесём автоматически/);
});
