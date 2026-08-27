import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const appRoot = fileURLToPath(new URL("../", import.meta.url));
const pageSource = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../app/page.module.css", import.meta.url), "utf8");

const benefitImages = [
  "calculation-main.webp",
  "calculation-price.webp",
  "delivery.webp",
  "estimate-pdf.webp",
  "installation-scheme.webp",
  "product-list.webp",
  "production-welding.webp",
];

test("homepage calculation section stays compact and exposes both calls to action", () => {
  assert.match(pageSource, /Рассчитайте дымоход прямо на сайте/u);
  assert.match(pageSource, /Вы рассчитываете — мы проверяем и отправляем/u);
  assert.equal(pageSource.match(/href="\/zamery\?edit=1"/gu)?.length, 2);
  assert.doesNotMatch(pageSource, /calculationFeature/u);
  assert.doesNotMatch(pageSource, /Готовый расчёт под ваш объект/u);
});

test("every calculation benefit illustration is a committed WebP asset", () => {
  for (const fileName of benefitImages) {
    const assetPath = `${appRoot}public/images/home/calculation-benefits/${fileName}`;
    assert.ok(existsSync(assetPath), `${fileName} must exist`);
    assert.match(pageSource, new RegExp(fileName.replace(".", "\\."), "u"));
  }
});

test("calculation results and process collapse to one column on mobile", () => {
  const mobileBlock = stylesSource.slice(stylesSource.indexOf("@media (max-width: 720px)"));
  assert.match(mobileBlock, /\.calculationResults\s*\{[\s\S]*?grid-template-columns:\s*1fr;/u);
  assert.match(mobileBlock, /\.calculationSteps\s*\{[\s\S]*?grid-template-columns:\s*1fr;/u);
});
