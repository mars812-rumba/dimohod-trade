import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/warranty/page.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/warranty/page.module.css", import.meta.url), "utf8");
const header = readFileSync(new URL("../components/SiteHeader.tsx", import.meta.url), "utf8");
const footer = readFileSync(new URL("../components/SiteFooter.tsx", import.meta.url), "utf8");
const sitemap = readFileSync(new URL("../app/sitemap.ts", import.meta.url), "utf8");

test("warranty page stays lightweight and uses email instead of a form", () => {
  assert.match(page, /Гарантия и сервис/u);
  assert.match(page, /Написать по гарантии/u);
  assert.match(page, /Номер и дата заказа/u);
  assert.match(page, /Пожалуйста, приложите фотографии/u);
  assert.match(page, /mailto:\$\{email\}/u);
  assert.match(page, /encodeURIComponent/u);
  assert.doesNotMatch(page, /<form|LeadForm/u);
  assert.doesNotMatch(page, /марки стали|шамотных|вермикулитовых|неправильной эксплуатации/u);
});

test("warranty page has metadata, structured data and responsive styles", () => {
  assert.match(page, /alternates: \{ canonical: pagePath \}/u);
  assert.match(page, /openGraph:/u);
  assert.match(page, /"@type": "WebPage"/u);
  assert.match(styles, /@media \(max-width: 520px\)/u);
});

test("warranty page is linked from navigation, footer and sitemap", () => {
  assert.equal(header.match(/href="\/warranty"/gu)?.length, 2);
  assert.match(footer, /href="\/warranty"/u);
  assert.match(sitemap, /absoluteUrl\("\/warranty"\)/u);
});

test("desktop navigation follows the requested order and calculator treatment", () => {
  const desktopStart = header.indexOf('<nav className="top-nav"');
  const desktopEnd = header.indexOf('<div className="header-right">');
  const desktopNav = header.slice(desktopStart, desktopEnd);
  const labels = ["Каталог", "Решения", "О компании", "Доставка", "Гарантия", "Статьи", "Ещё"];
  let position = -1;
  for (const label of labels) {
    const next = desktopNav.indexOf(label, position + 1);
    assert.ok(next > position, `${label} must follow the previous navigation item`);
    position = next;
  }
  assert.match(header, /header-configurator" href="\/raschet"[\s\S]*<span>Калькулятор<\/span>/u);
  assert.match(styles + readFileSync(new URL("../app/globals.css", import.meta.url), "utf8"), /\.header-configurator[\s\S]*background: #ed5b2a;/u);
});

test("mobile navigation keeps the same order and moves secondary links into more", () => {
  const mobileStart = header.indexOf('<nav aria-labelledby="mobile-menu-title"');
  const mobileEnd = header.indexOf('<div className="mobile-menu-footer">');
  const mobileNav = header.slice(mobileStart, mobileEnd);
  const labels = ["Каталог", "Решения", "О компании", "Доставка", "Гарантия", "Статьи", "Ещё"];
  let position = -1;
  for (const label of labels) {
    const next = mobileNav.indexOf(label, position + 1);
    assert.ok(next > position, `${label} must follow the previous mobile navigation item`);
    position = next;
  }
  assert.match(mobileNav, /<span>Ещё<\/span>[\s\S]*href="\/pechi"[\s\S]*Сохранённые расчёты[\s\S]*Оставить заявку/u);
});
