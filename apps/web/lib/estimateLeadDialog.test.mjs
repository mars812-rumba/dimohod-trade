import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const componentSource = fs.readFileSync(
  path.join(here, "../components/EstimateLeadDialog.tsx"),
  "utf8",
);
const configuratorSource = fs.readFileSync(
  path.join(here, "../components/ChimneyConfigurator.tsx"),
  "utf8",
);
const pdfSource = fs.readFileSync(path.join(here, "chimneyEstimatePdf.ts"), "utf8");

test("estimate PDF receives submitted customer contacts and the project logo", () => {
  assert.match(componentSource, /const customer: ChimneyEstimateCustomer/);
  assert.match(componentSource, /currentEstimate = \{ \.\.\.estimate, customer, generatedAt: new Date\(\) \}/);
  assert.match(componentSource, /onSubmitted\?\.\(customer\)/);
  assert.match(pdfSource, /brand\/logo-original\.jpg/);
  assert.match(pdfSource, /estimate\.customer\.name/);
  assert.match(pdfSource, /estimate\.customer\.contact/);
});

test("the estimate form sends the PDF and BOM to the existing lead endpoint", () => {
  assert.match(componentSource, /createChimneyEstimatePdfBlob/);
  assert.match(componentSource, /chimneyEstimateText/);
  assert.match(componentSource, /"estimate_json"/);
  assert.match(componentSource, /schemaVersion: 1/);
  assert.match(componentSource, /window\.location\.href/);
  assert.match(componentSource, /\/api\/v1\/leads/);
  assert.match(componentSource, /predvaritelnaya-smeta-dymohoda\.pdf/);
  assert.match(componentSource, /reachMetrikaGoal\(METRIKA_GOALS\.leadSubmitted/);
  assert.match(componentSource, /reachMetrikaGoal\(metrikaGoal/);
  assert.match(componentSource, /deepMeasurementFormSent/);
});

test("the form collects a contact method, consent and a spam honeypot", () => {
  for (const method of ["phone", "whatsapp", "telegram", "email"]) {
    assert.match(componentSource, new RegExp(`value="${method}"`));
  }
  assert.match(componentSource, /<PersonalDataConsent/);
  assert.match(componentSource, /name="website"/);
});

test("inline gate collects name and phone before revealing an estimate", () => {
  assert.match(componentSource, /if \(inline\)/);
  assert.match(componentSource, /name="contact"/);
  assert.match(componentSource, /name="contact_method" type="hidden" value="phone"/);
  assert.match(componentSource, /Показать стоимость и состав|предварительную стоимость и состав/);
});

test("the detailed configurator gates its estimate before price, BOM and PDF", () => {
  assert.equal(
    Array.from(configuratorSource.matchAll(/<EstimateLeadDialog/g)).length,
    1,
  );
  assert.match(configuratorSource, /!estimateUnlocked[\s\S]*inline[\s\S]*setEstimateUnlocked\(true\)/);
  assert.ok(
    configuratorSource.indexOf("<EstimateLeadDialog") < configuratorSource.indexOf("selectedBom.map"),
    "contact gate must be rendered before the protected detailed BOM",
  );
});
