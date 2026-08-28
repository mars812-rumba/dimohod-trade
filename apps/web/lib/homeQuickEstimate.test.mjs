import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const helper = readFileSync(new URL("./homeQuickEstimate.ts", import.meta.url), "utf8");
const component = readFileSync(new URL("../components/HomeQuickEstimate.tsx", import.meta.url), "utf8");

test("quick estimate keeps the confirmed calculation defaults", () => {
  assert.match(helper, /QUICK_ESTIMATE_DEFAULT_DIAMETER_MM = 120/);
  assert.match(helper, /QUICK_ESTIMATE_FLOOR_HEIGHT_MM = 2500/);
  assert.match(helper, /QUICK_ESTIMATE_ATTIC_HEIGHT_MM = 1500/);
  assert.match(helper, /QUICK_ESTIMATE_ROOF_OUTLET_HEIGHT_MM = 1500/);
  assert.match(helper, /Кровельный комплект: УПК \+ мастер-флеш/);
});

test("quick estimate uses the existing catalog and transfers answers to measurements", () => {
  assert.match(component, /\/api\/v1\/products/);
  assert.match(component, /buildChimneyEstimate/);
  assert.match(component, /saveConfiguratorDraft\(window\.sessionStorage, draft\)/);
  assert.match(component, /router\.push\(`\/zamery\?/);
});

test("price and BOM stay gated until the existing lead form saves the estimate", () => {
  assert.match(component, /!leadSubmitted/);
  assert.match(component, /estimate && leadSubmitted/);
  assert.match(component, /<EstimateLeadDialog/);
  assert.match(component, /source="chimney-quick-estimate"/);
  assert.match(component, /onSubmitted=\{\(\) => setLeadSubmitted\(true\)\}/);
});

test("route choices use raster renders and existing measurement icons", () => {
  assert.match(component, /route-through-roof\.webp/);
  assert.match(component, /route-along-facade\.webp/);
  assert.match(component, /object-bathhouse\.webp/);
  assert.doesNotMatch(component, /\.svg/);
});
