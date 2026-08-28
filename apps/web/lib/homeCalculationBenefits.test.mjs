import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const appRoot = fileURLToPath(new URL("../", import.meta.url));
const pageSource = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../app/page.module.css", import.meta.url), "utf8");

const benefitImages = ["configurator-mobile.webp", "configurator-desktop.webp"];

test("homepage calculation section exposes one call to action and no duplicated process", () => {
  assert.match(pageSource, /Рассчитайте дымоход прямо на сайте/u);
  assert.doesNotMatch(pageSource, /Вы рассчитываете — мы проверяем и отправляем/u);
  assert.doesNotMatch(pageSource, /Проверка специалистом/u);
  assert.equal(pageSource.match(/href="\/zamery\?edit=1"/gu)?.length, 1);
  assert.match(pageSource, /Стоимость комплекта/u);
  assert.match(pageSource, /Схема монтажа по замерам/u);
  assert.doesNotMatch(pageSource, /Индивидуальная монтажная схема под ваш замер/u);
  assert.ok(
    pageSource.indexOf("calculationResults") < pageSource.indexOf("calculationAction"),
    "the calculation action must follow the result list",
  );
});

test("calculation showcase uses committed mobile and desktop WebP renders", () => {
  for (const fileName of benefitImages) {
    const assetPath = `${appRoot}public/images/home/calculation-benefits/${fileName}`;
    assert.ok(existsSync(assetPath), `${fileName} must exist`);
    assert.match(pageSource, new RegExp(fileName.replace(".", "\\."), "u"));
  }
  assert.match(pageSource, /<picture className=\{styles\.calculationRender\}>/u);
  assert.match(pageSource, /media="\(max-width: 720px\)"/u);
});

test("calculation results collapse to one column on mobile", () => {
  const mobileBlock = stylesSource.slice(stylesSource.indexOf("@media (max-width: 720px)"));
  assert.match(mobileBlock, /\.calculationResults\s*\{[\s\S]*?grid-template-columns:\s*1fr;/u);
  assert.match(mobileBlock, /\.calculationShowcase\s*\{[\s\S]*?grid-template-columns:\s*1fr;/u);
});
