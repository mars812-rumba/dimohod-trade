import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/solutions/pech/page.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const landing = readFileSync(new URL("../components/PechScenarioLanding.tsx", import.meta.url), "utf8");
const estimate = readFileSync(new URL("../components/HomeQuickEstimate.tsx", import.meta.url), "utf8");
const scenarios = readFileSync(new URL("./scenarioPages.ts", import.meta.url), "utf8");

test("stove solution uses its dedicated commercial landing and calculator defaults", () => {
  assert.match(page, /PechScenarioLanding/);
  assert.doesNotMatch(page, /ScenarioPageTemplate/);
  assert.match(landing, /fixedObjectType="house"/);
  assert.match(landing, /fixedEquipmentType="pech"/);
  assert.match(estimate, /fixedEquipmentType\?: QuickEstimateEquipment/);
});

test("stove landing includes the confirmed work and keeps one calculation path", () => {
  assert.match(landing, /objectIds=\{\[5\]\}/);
  assert.match(landing, /source="solution-pech-help"/);
  assert.match(landing, /leadSource="solution-pech-quick-estimate"/);
  assert.match(landing, /\/images\/home\/scenario-pech-form-stove\.webp/);
  assert.doesNotMatch(landing, /Стандарт №1|готовый комплект/iu);
});

test("stove solution and its home card use the supplied installed-stove photo", () => {
  assert.match(scenarios, /heroImage: "\/images\/home\/scenario-pech-installed-stove\.webp"/);
  assert.match(home, /image: "\/images\/home\/scenario-pech-installed-stove\.webp"/);
});
