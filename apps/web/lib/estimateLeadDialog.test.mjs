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

test("the estimate form sends the PDF and BOM to the existing lead endpoint", () => {
  assert.match(componentSource, /createChimneyEstimatePdfBlob/);
  assert.match(componentSource, /chimneyEstimateText/);
  assert.match(componentSource, /"estimate_json"/);
  assert.match(componentSource, /schemaVersion: 1/);
  assert.match(componentSource, /window\.location\.href/);
  assert.match(componentSource, /\/api\/v1\/leads/);
  assert.match(componentSource, /predvaritelnaya-smeta-dymohoda\.pdf/);
});

test("the form collects a contact method, consent and a spam honeypot", () => {
  for (const method of ["phone", "whatsapp", "telegram", "email"]) {
    assert.match(componentSource, new RegExp(`value="${method}"`));
  }
  assert.match(componentSource, /<PersonalDataConsent/);
  assert.match(componentSource, /name="website"/);
});

test("both estimate action areas expose the manager button", () => {
  assert.equal(
    Array.from(configuratorSource.matchAll(/<EstimateLeadDialog/g)).length,
    2,
  );
});
