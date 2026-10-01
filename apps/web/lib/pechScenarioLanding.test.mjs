import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/solutions/pech/page.tsx", import.meta.url), "utf8");
const landing = readFileSync(new URL("../components/PechScenarioLanding.tsx", import.meta.url), "utf8");
const kit = readFileSync(new URL("../components/StandardPechKit.tsx", import.meta.url), "utf8");
const estimate = readFileSync(new URL("../components/HomeQuickEstimate.tsx", import.meta.url), "utf8");

test("stove solution uses its dedicated commercial landing and preset", () => {
  assert.match(page, /PechScenarioLanding/);
  assert.doesNotMatch(page, /ScenarioPageTemplate/);
  assert.match(landing, /fixedObjectType="house"/);
  assert.match(landing, /fixedEquipmentType="pech"/);
  assert.match(estimate, /fixedEquipmentType\?: QuickEstimateEquipment/);
});

test("stove landing includes the confirmed work, standard kit and lead paths", () => {
  assert.match(landing, /<StandardPechKit/);
  assert.match(landing, /objectIds=\{\[5\]\}/);
  assert.match(landing, /source="solution-pech-help"/);
  assert.match(landing, /leadSource="solution-pech-quick-estimate"/);
});

test("standard kit keeps the supplied BOM and flags catalog mismatches", () => {
  assert.match(kit, /KIT_PRICE_RUB = 28_540/);
  assert.equal((kit.match(/key: "/g) ?? []).length, 9);
  assert.match(kit, /quantity: 2/);
  assert.match(kit, /DT-GOLYE-09-00-D120/);
  assert.match(kit, /DT-SW50-19-00-D120-220/);
  assert.match(kit, /Точного размера 600×700/);
  assert.match(kit, /без автоматической замены/);
  assert.match(kit, /\/api\/v1\/products/);
});
