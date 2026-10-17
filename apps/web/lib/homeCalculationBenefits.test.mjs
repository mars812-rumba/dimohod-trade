import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const appRoot = fileURLToPath(new URL("../", import.meta.url));
const pageSource = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../app/page.module.css", import.meta.url), "utf8");

const mockupSource = readFileSync(new URL("../components/PhoneMockup3D.tsx", import.meta.url), "utf8");
const benefitImages = ["screen-1.webp", "screen-2.webp", "screen-3.webp", "screen-4.webp"];

test("homepage calculation section exposes one call to action and no duplicated process", () => {
  assert.match(pageSource, /Узнайте ориентировочную стоимость/u);
  assert.doesNotMatch(pageSource, /Вы рассчитываете — мы проверяем и отправляем/u);
  assert.equal(pageSource.match(/<h3>Проверка специалистом<\/h3>/gu)?.length, 1);
  assert.equal(pageSource.match(/className=\{styles\.calculationFormatCta\} href="\/raschet"/gu)?.length, 1);
  assert.match(pageSource, /Стоимость комплекта/u);
  assert.match(pageSource, /Предварительная схема по замерам/u);
  assert.doesNotMatch(pageSource, /Индивидуальная монтажная схема под ваш замер/u);
  assert.ok(
    pageSource.indexOf("calculationResults") < pageSource.indexOf("calculationAction"),
    "the calculation action must follow the result list",
  );
});

test("calculation showcase preserves the existing phone mockup and its WebP assets", () => {
  for (const fileName of benefitImages) {
    const assetPath = `${appRoot}public/images/home/phone-mockup/${fileName}`;
    assert.ok(existsSync(assetPath), `${fileName} must exist`);
    assert.match(mockupSource, new RegExp(fileName.replace(".", "\\."), "u"));
  }
  assert.match(pageSource, /<PhoneMockup3D assetBasePath=\{basePath\} \/>/u);
});

test("calculation results collapse to one column on mobile", () => {
  const mobileBlock = stylesSource.slice(stylesSource.indexOf("@media (max-width: 720px)"));
  assert.match(mobileBlock, /\.calculationResults\s*\{[\s\S]*?grid-template-columns:\s*1fr;/u);
  assert.match(mobileBlock, /\.calculationShowcase\s*\{[\s\S]*?grid-template-columns:\s*1fr;/u);
});
