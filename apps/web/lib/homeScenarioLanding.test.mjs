import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(new URL("../app/solutions/dom/page.tsx", import.meta.url), "utf8");
const landingSource = readFileSync(new URL("../components/HomeScenarioLanding.tsx", import.meta.url), "utf8");
const landingStyles = readFileSync(new URL("../components/HomeScenarioLanding.module.css", import.meta.url), "utf8");
const trustSource = readFileSync(new URL("../components/SolutionTrustSections.tsx", import.meta.url), "utf8");
const trustStyles = readFileSync(new URL("../components/SolutionTrustSections.module.css", import.meta.url), "utf8");
const trustData = readFileSync(new URL("./solutionTrust.ts", import.meta.url), "utf8");
const quickEstimateSource = readFileSync(new URL("../components/HomeQuickEstimate.tsx", import.meta.url), "utf8");
const leadFormSource = readFileSync(new URL("../components/LeadForm.tsx", import.meta.url), "utf8");

test("home scenario uses the dedicated advertising landing", () => {
  assert.match(pageSource, /HomeScenarioLanding/);
  assert.doesNotMatch(pageSource, /ScenarioPageTemplate/);
  assert.match(landingSource, /<h1>Рассчитайте дымоход для дома<\/h1>/);
  assert.match(landingSource, /href="#quick-estimate"/);
  assert.match(landingSource, /fixedObjectType="house"/);
});

test("landing offers a complete calculation and an alternative lead path", () => {
  assert.match(landingSource, /Ориентировочная стоимость/);
  assert.match(landingSource, /Товарный состав/);
  assert.match(landingSource, /Не знаете параметры\? Поможем подобрать/);
  assert.match(landingSource, /source="solution-dom-help"/);
  assert.match(landingSource, /submitLabel="Оставить заявку"/);
  assert.doesNotMatch(landingSource, /Отправить материалы/);
  assert.match(leadFormSource, /window\.location\.href/);
  assert.match(quickEstimateSource, /fixedObjectType\?: QuickEstimateObject/);
});

test("landing shows reusable company advantages, warranty and current certificates", () => {
  assert.match(landingSource, /SolutionTrustSections/);
  assert.match(trustSource, /Собственное производство/);
  assert.match(trustSource, /Гарантия от 5 лет/);
  assert.match(trustSource, /Доставка по России/);
  assert.match(trustSource, /корректного подбора, монтажа и условий/);
  assert.match(trustData, /действует до 30\.06\.2028/);
  assert.match(trustData, /действует до 09\.01\.2027/);
  assert.match(trustStyles, /@media \(max-width: 680px\)/);
});

test("landing keeps SEO content, structured FAQ and explicit mobile layouts", () => {
  assert.match(landingSource, /"@type": "FAQPage"/);
  assert.match(landingSource, /Что нужно определить до подбора/);
  assert.match(landingSource, /Что влияет на состав комплекта/);
  assert.match(landingStyles, /@media \(max-width: 680px\)/);
  assert.doesNotMatch(landingSource, /[—–]/);
});
