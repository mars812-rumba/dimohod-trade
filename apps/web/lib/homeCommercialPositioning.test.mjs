import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const hero = read("../components/HomeHeroCarousel.tsx");
const page = read("../app/page.tsx");
const css = read("../components/HomeHeroCarousel.module.css");

test("homepage omits the redundant category overview while the hero retains catalogue navigation", () => {
  assert.doesNotMatch(page, /catalogGroups|styles\.catalogSection|Ищите по назначению|Каталог для тех, кто знает деталь/);
  assert.match(page, /styles\.safetySection/);
  assert.match(page, /styles\.trustSection/);
  assert.match(hero, /href="\/catalog"/);
});

test("hero describes the buyer result with two existing routes and three compact benefits", () => {
  assert.match(hero, /Подберём комплект дымохода для вашего дома или бани/);
  assert.match(hero, /Производство дымоходов · Санкт-Петербург и Ленинградская область/);
  assert.match(hero, /className=\{styles\.cta\} href="\/bystryy-raschet"/);
  assert.match(hero, /className=\{styles\.catalogCta\} href="\/catalog"/);
  const benefits = hero.match(/<ul className=\{styles\.heroBenefits\}[\s\S]*?<\/ul>/)?.[0];
  assert.equal(benefits?.match(/<li>/g)?.length, 3);
  for (const text of ["Предварительная стоимость", "Состав комплекта", "Схема и PDF-смета"]) assert.ok(benefits.includes(text));
});

test("existing positioning block is revised once and retains the preliminary boundary", () => {
  assert.equal(page.match(/id="positioning-title"/g)?.length, 1);
  assert.match(page, /Не нужно разбираться в десятках деталей/);
  for (const text of ["Понятная стоимость", "Наглядная схема", "Проверка специалистом", "Предварительная схема не заменяет проект и документацию производителя"]) assert.ok(page.includes(text));
  assert.doesNotMatch(page, /подготовьте точную смету/);
});

test("commercial metadata preserves canonical and existing organization structured data", () => {
  assert.match(page, /Купить дымоход в СПб от производителя/);
  assert.match(page, /сэндвич-системы для дома и бани/);
  assert.match(page, /alternates: \{ canonical: "\/" \}/);
  assert.match(page, /JSON\.stringify\(organizationJsonLd\)/);
  assert.doesNotMatch(page, /robots:.*noindex/);
});

test("hero can grow with content without absolute mobile actions or new media dependencies", () => {
  assert.match(css, /min-height: calc\(100svh - 72px\)/);
  assert.match(css, /\.heroOffer \{\s*position: relative;/);
  assert.doesNotMatch(css, /\.heroActions \{[^}]*position: absolute/);
  assert.match(hero, /autoPlay[\s\S]*loop[\s\S]*muted[\s\S]*playsInline/);
  assert.doesNotMatch(hero, /mobileVideoRequested|videoToggle/);
});
