import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const helper = readFileSync(new URL("./homeQuickEstimate.ts", import.meta.url), "utf8");
const component = readFileSync(new URL("../components/HomeQuickEstimate.tsx", import.meta.url), "utf8");
const productPage = readFileSync(new URL("../app/product/[slug]/page.tsx", import.meta.url), "utf8");
const productExperience = readFileSync(new URL("../components/ProductExperience.tsx", import.meta.url), "utf8");

test("quick estimate keeps the confirmed calculation defaults", () => {
  assert.match(helper, /QUICK_ESTIMATE_DEFAULT_DIAMETER_MM = 120/);
  assert.match(helper, /QUICK_ESTIMATE_FLOOR_HEIGHT_MM = 2500/);
  assert.match(helper, /QUICK_ESTIMATE_ATTIC_HEIGHT_MM = 1500/);
  assert.match(helper, /QUICK_ESTIMATE_ROOF_OUTLET_HEIGHT_MM = 1500/);
  assert.match(helper, /QUICK_ESTIMATE_HEATER_HEIGHT_MM = 800/);
  assert.match(helper, /QUICK_ESTIMATE_WARMUP_PIPE_LENGTH_MM = 1000/);
  assert.match(helper, /QUICK_ESTIMATE_SANDWICH_PIPE_LENGTH_MM = 1000/);
  assert.match(helper, /QUICK_ESTIMATE_BASE_SANDWICH_PIPE_QUANTITY = 3/);
  assert.match(helper, /QUICK_ESTIMATE_EXTRA_FLOOR_SANDWICH_PIPE_QUANTITY = 2/);
  assert.match(helper, /Кровельный комплект: УПК \+ мастер-флеш/);
  assert.match(component, /useState<EquipmentStatus \| null>\("installed"\)/);
});

test("quick ceiling estimate subtracts the assumed heater and fixes the confirmed pipe kit", () => {
  assert.match(helper, /totalHeightMm - QUICK_ESTIMATE_HEATER_HEIGHT_MM - QUICK_ESTIMATE_WARMUP_PIPE_LENGTH_MM/);
  assert.match(helper, /answers\.floors - 1/);
  assert.match(helper, /line\.key === "rotary-damper"/);
  assert.match(helper, /thicknessProfile: "first-floor-0\.8"/);
  assert.match(helper, /thicknessProfile: "upper-outdoor-0\.5"/);
  assert.match(helper, /answers\.route !== "ceiling" \|\| !answers\.hasAttic/);
  assert.match(component, /applyQuickEstimateBomRules\(bomForVariant/);
  assert.match(component, /if \(line\.thicknessProfile\)/);
});

test("quick estimate uses the existing catalog and keeps the public result self-contained", () => {
  assert.match(component, /\/api\/v1\/products/);
  assert.match(component, /buildChimneyEstimate/);
  assert.doesNotMatch(component, /saveConfiguratorDraft/);
  assert.doesNotMatch(component, /MEASUREMENTS_INTAKE_STORAGE_KEY/);
  assert.doesNotMatch(component, /useRouter/);
  assert.doesNotMatch(component, /\/zamery/);
});

test("price and full product BOM appear before the optional manager handoff", () => {
  assert.match(component, /estimate\.lines\.map/);
  assert.match(component, /Цена по запросу/);
  assert.match(component, /primary_image/);
  assert.match(component, /quickEstimateProductHref/);
  assert.match(component, /Открыть товар/);
  assert.match(component, /!leadSubmitted/);
  assert.doesNotMatch(component, /estimate && leadSubmitted/);
  assert.match(component, /<EstimateLeadDialog/);
  assert.ok(
    component.indexOf("estimate.lines.map") < component.indexOf("<EstimateLeadDialog"),
    "BOM must be rendered before the contact form",
  );
  assert.match(component, /source="chimney-quick-estimate"/);
  assert.match(component, /METRIKA_GOALS\.quickEstimateContactSent/);
  assert.match(component, /onSubmitted=\{\(\) => setLeadSubmitted\(true\)\}/);
});

test("quick result states its accuracy and remains explicitly preliminary", () => {
  assert.match(component, /отклонением ±30%/);
  assert.match(component, /Менеджер проверит размеры, совместимость/);
  assert.doesNotMatch(component, /профессиональн/iu);
  assert.doesNotMatch(component, /CompactChimneyScheme/);
});

test("route choices use raster renders and existing measurement icons", () => {
  assert.match(component, /route-through-roof\.webp/);
  assert.match(component, /route-along-facade\.webp/);
  assert.match(component, /object-bathhouse\.webp/);
  assert.doesNotMatch(component, /\.svg/);
});

test("product navigation preserves and restores the current quick estimate", () => {
  assert.match(component, /QUICK_ESTIMATE_RETURN_KEY/);
  assert.match(component, /window\.sessionStorage\.setItem\(QUICK_ESTIMATE_RETURN_KEY/);
  assert.match(component, /window\.sessionStorage\.getItem\(QUICK_ESTIMATE_RETURN_KEY/);
  assert.doesNotMatch(component, /skipCatalogRefresh/);
  assert.match(component, /line\.productKind === "консоль"/);
  assert.match(component, /q: line\.catalogSearch/);
  assert.match(component, /setMatches\(saved\.matches\)/);
  assert.match(component, /setStep\(4\)/);
  assert.match(component, /from=quick-estimate/);
  assert.match(productPage, /returnToQuickEstimate=\{fromQuickEstimate\}/);
  assert.match(productExperience, /Вернуться к расчёту/);
  assert.match(productExperience, /\/bystryy-raschet#quick-estimate/);
});
