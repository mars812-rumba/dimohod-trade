import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const facts = read("./installationTerms.ts");
const section = read("../components/InstallationTermsSection.tsx");

test("confirmed commercial conditions keep measurement, manufacture and warranties separate", () => {
  for (const text of ["300 км", "Александра Невского", "оплачивается отдельно", "не входит в стоимость договора", "2 000 ₽", "2 500 ₽", "3 000 ₽", "от 3 до 10 рабочих дней", "не срок монтажа", "до 12 лет", "марки стали и толщины металла", "36 месяцев", "тестовую топку", "акт сдачи-приёмки"]) assert.ok(facts.includes(text), text);
  assert.doesNotMatch(facts, /бесплатн|ремонт дымоходов|пуск газа/);
  assert.match(section, /<dl/);
  assert.match(section, /terms\.measurementPrices\.map/);
  assert.doesNotMatch(section, /useEffect|use client|<form/);
});

test("homepage links to complete server-rendered conditions and fireplace scope stays specific", () => {
  assert.match(read("../app/page.tsx"), /<InstallationTermsSection compact \/>/);
  assert.match(section, /href="\/solutions\/dom#installation-terms"/);
  assert.match(read("../components/SolutionTrustSections.tsx"), /<InstallationTermsSection fireplace=\{fireplace\} \/>/);
  assert.match(read("../components/KaminScenarioLanding.tsx"), /assetBasePath=\{assetBasePath\} fireplace/);
  assert.match(section, /fireplace \? <p>\{terms\.fireplace\}/);
  assert.match(read("../app/warranty/page.tsx"), /installationTerms\.productWarranty/);
  assert.match(read("../app/warranty/page.tsx"), /installationTerms\.installationWarranty/);
});

test("article copy explains the estimate instead of giving internal implementation instructions", () => {
  const guides = read("./guideArticles.ts");
  assert.doesNotMatch(guides, /предварительный BOM из реальных SKU|В конфигураторе опора тройника должна/);
  assert.match(guides, /Проверьте, учтены ли в смете опора нижнего узла/);
});
