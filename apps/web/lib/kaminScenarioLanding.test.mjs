import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/solutions/kamin/page.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const landing = readFileSync(new URL("../components/KaminScenarioLanding.tsx", import.meta.url), "utf8");
const scenarios = readFileSync(new URL("./scenarioPages.ts", import.meta.url), "utf8");
const metadata = readFileSync(new URL("./scenarioMetadata.ts", import.meta.url), "utf8");

test("fireplace solution uses a dedicated landing with a preselected quick calculator", () => {
  assert.match(page, /KaminScenarioLanding/);
  assert.doesNotMatch(page, /ScenarioPageTemplate/);
  assert.match(landing, /HomeQuickEstimate/);
  assert.match(landing, /fixedObjectType="house"/);
  assert.match(landing, /fixedEquipmentType="kamin"/);
  assert.match(landing, /leadSource="solution-kamin-quick-estimate"/);
  assert.match(landing, /source="solution-kamin-project"/);
  assert.match(landing, /Рассчитать дымоход/);
});

test("quick estimate and detailed measurements expose fireplace as a heater type", () => {
  const quickEstimate = readFileSync(new URL("../components/HomeQuickEstimate.tsx", import.meta.url), "utf8");
  const measurements = readFileSync(new URL("../components/BanyaIntakeFlow.tsx", import.meta.url), "utf8");
  assert.match(quickEstimate, /id: "kamin", label: "Камин"/);
  assert.match(measurements, /\["kamin", "Камин"/);
});

test("fireplace landing connects the confirmed case and supplied photos", () => {
  assert.match(landing, /objectIds=\{\[6\]\}/);
  assert.match(landing, /\/images\/works\/object-6\/03\.webp/);
  assert.match(scenarios, /heroImage: "\/images\/works\/object-6\/06\.webp"/);
  assert.match(home, /slug: "kamin"[\s\S]*image: "\/images\/works\/object-6\/06\.webp"/);
  assert.match(metadata, /content\.slug === "banya" \|\| content\.slug === "kamin"/);
});

test("fireplace landing covers the commercial intent and verified project scope", () => {
  assert.match(landing, /Дымоход и монтаж каминной топки под ключ/);
  assert.match(landing, /КП «Дворянская усадьба»/);
  assert.match(landing, /герметизация кровли/);
  assert.match(landing, /силиката кальция SILCA/);
  assert.match(landing, /FAQPage/);
  assert.match(scenarios, /Дымоход для камина: монтаж топки под ключ в СПб/);
});
