import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(new URL("../app/solutions/banya/page.tsx", import.meta.url), "utf8");
const homePageSource = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const landingSource = readFileSync(new URL("../components/BanyaScenarioLanding.tsx", import.meta.url), "utf8");
const quickEstimateSource = readFileSync(new URL("../components/HomeQuickEstimate.tsx", import.meta.url), "utf8");
const scenarioSource = readFileSync(new URL("./scenarioPages.ts", import.meta.url), "utf8");

test("bath scenario uses a dedicated commercial landing", () => {
  assert.match(pageSource, /BanyaScenarioLanding/);
  assert.doesNotMatch(pageSource, /ScenarioPageTemplate/);
  assert.match(landingSource, /<h1>Дымоход для банной печи: подбор комплекта<\/h1>/);
  assert.match(landingSource, /fixedObjectType="banya"/);
  assert.match(landingSource, /leadSource="solution-banya-quick-estimate"/);
});

test("bath landing connects proof, detailed measurements and SEO content", () => {
  assert.match(landingSource, /objectIds=\{\[7\]\}/);
  assert.match(landingSource, /\/zamery\?edit=1&object=banya/);
  assert.match(landingSource, /Как выбирают дымоход для банной печи/);
  assert.match(landingSource, /Частые вопросы о дымоходе для бани/);
  assert.match(landingSource, /"@type": "FAQPage"/);
});

test("quick estimate preselects the bath heater and accepts a page-specific source", () => {
  assert.match(quickEstimateSource, /fixedObjectType === "banya" \? "bania" : ""/);
  assert.match(quickEstimateSource, /leadSource = "chimney-quick-estimate"/);
  assert.match(quickEstimateSource, /source=\{leadSource\}/);
});

test("bath landing uses the supplied bathhouse interior as its hero", () => {
  assert.match(scenarioSource, /heroImage: "\/images\/solutions\/banya\/bathhouse-interior\.webp"/);
  assert.match(homePageSource, /image: "\/images\/solutions\/banya\/bathhouse-interior\.webp"/);
  assert.match(scenarioSource, /Парная с банной печью и вертикальным металлическим дымоходом/);
});
