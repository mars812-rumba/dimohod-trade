import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const solidFuelPage = readFileSync(new URL("../app/solutions/tverdotoplivny-kotel/page.tsx", import.meta.url), "utf8");
const gasPage = readFileSync(new URL("../app/solutions/gazovyy-kotel/page.tsx", import.meta.url), "utf8");
const landing = readFileSync(new URL("../components/BoilerScenarioLanding.tsx", import.meta.url), "utf8");
const scenarios = readFileSync(new URL("./scenarioPages.ts", import.meta.url), "utf8");
const metadata = readFileSync(new URL("./scenarioMetadata.ts", import.meta.url), "utf8");

test("boiler solutions use the dedicated commercial landing", () => {
  assert.match(solidFuelPage, /BoilerScenarioLanding/);
  assert.match(solidFuelPage, /kind="solid-fuel"/);
  assert.match(gasPage, /BoilerScenarioLanding/);
  assert.match(gasPage, /kind="gas"/);
  assert.doesNotMatch(solidFuelPage, /ScenarioPageTemplate/);
  assert.doesNotMatch(gasPage, /ScenarioPageTemplate/);
});

test("each calculator opens with the house and matching boiler selected", () => {
  assert.match(landing, /fixedObjectType="house"/);
  assert.match(landing, /equipmentType: "tt-kotel"/);
  assert.match(landing, /equipmentType: "gaz"/);
  assert.match(landing, /fixedEquipmentType=\{config\.equipmentType\}/);
  assert.match(landing, /leadSource: "solution-solid-fuel-boiler"/);
  assert.match(landing, /leadSource: "solution-gas-boiler"/);
  assert.match(landing, /leadSource=\{`\$\{config\.leadSource\}-quick-estimate`\}/);
});

test("solid fuel landing reuses the confirmed completed work", () => {
  assert.match(landing, /objectId: 3/);
  assert.match(landing, /Медное озеро/);
  assert.match(landing, /AISI 321/);
  assert.match(landing, /HomeWorksShowcase objectIds=\{\[config\.work\.objectId\]\}/);
});

test("boiler landings include contact paths, trust, FAQ and structured data", () => {
  assert.match(landing, /<HomeQuickEstimate/);
  assert.match(landing, /<LeadForm/);
  assert.match(landing, /<SolutionTrustSections/);
  assert.match(landing, /"@type": "FAQPage"/);
  assert.match(landing, /без отправки контактов/);
  assert.match(landing, /href="#quick-estimate"/);
  assert.match(landing, /href="#help-with-selection"/);
});

test("boiler metadata uses canonical scenario data and actual hero dimensions", () => {
  assert.match(scenarios, /Дымоход для твердотопливного котла - расчёт комплекта/);
  assert.match(scenarios, /Дымоход для газового котла - расчёт по модели/);
  assert.match(metadata, /content\.slug === "tverdotoplivny-kotel" \|\| content\.slug === "gazovyy-kotel"/);
  assert.match(metadata, /\{ width: 960, height: 720 \}/);
});
