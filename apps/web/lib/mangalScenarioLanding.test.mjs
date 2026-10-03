import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/solutions/mangalnaya-zona/page.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const hub = readFileSync(new URL("../app/solutions/page.tsx", import.meta.url), "utf8");
const header = readFileSync(new URL("../components/SiteHeader.tsx", import.meta.url), "utf8");
const landing = readFileSync(new URL("../components/MangalScenarioLanding.tsx", import.meta.url), "utf8");
const scenarios = readFileSync(new URL("./scenarioPages.ts", import.meta.url), "utf8");
const metadata = readFileSync(new URL("./scenarioMetadata.ts", import.meta.url), "utf8");

test("barbecue solution uses a dedicated photo-led landing without a calculator", () => {
  assert.match(page, /MangalScenarioLanding/);
  assert.doesNotMatch(page, /ScenarioPageTemplate/);
  assert.doesNotMatch(landing, /HomeQuickEstimate|configurator|готовый комплект/iu);
  assert.match(landing, /source="solution-mangal-project"/);
  assert.match(landing, /Получить расчёт по фото/);
});

test("barbecue landing uses the supplied images and confirmed completed work", () => {
  assert.match(scenarios, /heroImage: "\/images\/solutions\/mangal\/hero\.webp"/);
  assert.match(landing, /\/images\/solutions\/mangal\/request-form\.webp/);
  assert.match(landing, /objectIds=\{\[9\]\}/);
  assert.match(landing, /Красноозерье/);
  assert.match(landing, /два вытяжных зонта/iu);
  assert.match(landing, /плавной регулировкой частоты вращения/);
});

test("barbecue solution is discoverable and has complete metadata", () => {
  assert.match(home, /slug: "mangalnaya-zona"[\s\S]*href: "\/solutions\/mangalnaya-zona"/);
  assert.match(hub, /"mangalnaya-zona"/);
  assert.equal((header.match(/\/solutions\/mangalnaya-zona/g) ?? []).length, 2);
  assert.match(scenarios, /Вытяжка и дымоход для мангала — расчёт и монтаж в СПб/);
  assert.match(metadata, /content\.slug === "mangalnaya-zona"/);
  assert.match(landing, /FAQPage/);
});

test("barbecue page keeps one primary conversion and a quieter proof link", () => {
  assert.match(landing, /className=\{styles\.primaryButton\} href="#project-request"/);
  assert.match(landing, /className=\{styles\.heroTextLink\} href="#completed-mangal"/);
  assert.match(landing, /submitLabel="Оставить заявку"/);
});
