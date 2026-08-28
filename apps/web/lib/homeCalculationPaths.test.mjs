import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const header = readFileSync(new URL("../components/SiteHeader.tsx", import.meta.url), "utf8");
const hero = readFileSync(new URL("../components/HomeHeroCarousel.tsx", import.meta.url), "utf8");

test("homepage separates quick budget from the full measurement by intent", () => {
  assert.match(page, /Готовите реальный заказ\?/);
  assert.match(page, /Не знаете размеры\?/);
  assert.match(page, /Ориентировочная точность ±30%/);
  assert.match(page, /Полный замер для точной сметы/);
  assert.match(page, /href="\/#quick-estimate"/);
});

test("hero and navigation prioritize the full measurement", () => {
  assert.match(hero, /Полный замер для заказа/);
  assert.match(header, /header-configurator" href="\/zamery\?edit=1"/);
  assert.match(header, /Готовите заказ\? Полный замер/);
  assert.match(header, /Не знаете размеры\? Быстрый расчёт/);
});
