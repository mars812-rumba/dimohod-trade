import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const helper = readFileSync(new URL("./homeQuickEstimate.ts", import.meta.url), "utf8");
const component = readFileSync(new URL("../components/HomeQuickEstimate.tsx", import.meta.url), "utf8");
const quickScheme = readFileSync(new URL("../components/QuickEstimateScheme.tsx", import.meta.url), "utf8");
const productPage = readFileSync(new URL("../app/product/[slug]/page.tsx", import.meta.url), "utf8");
const productExperience = readFileSync(new URL("../components/ProductExperience.tsx", import.meta.url), "utf8");

test("quick estimate keeps the confirmed calculation defaults", () => {
  assert.match(helper, /QUICK_ESTIMATE_DEFAULT_DIAMETER_MM = 120/);
  assert.match(helper, /QUICK_ESTIMATE_FLOOR_HEIGHT_MM = 2500/);
  assert.match(helper, /QUICK_ESTIMATE_FLOOR_THICKNESS_MM = 200/);
  assert.match(helper, /QUICK_ESTIMATE_ATTIC_HEIGHT_MM = 1500/);
  assert.match(helper, /QUICK_ESTIMATE_ROOF_OUTLET_HEIGHT_MM = 1500/);
  assert.match(helper, /QUICK_ESTIMATE_HEATER_HEIGHT_MM = 800/);
  assert.match(helper, /QUICK_ESTIMATE_WARMUP_PIPE_LENGTH_MM = 1000/);
  assert.match(helper, /QUICK_ESTIMATE_SANDWICH_PIPE_LENGTH_MM = 1000/);
  assert.match(helper, /QUICK_ESTIMATE_BASE_SANDWICH_PIPE_QUANTITY = 3/);
  assert.match(helper, /QUICK_ESTIMATE_EXTRA_FLOOR_SANDWICH_PIPE_QUANTITY = 2/);
  assert.match(helper, /QUICK_ESTIMATE_SCHEME_ROOF_ANGLE_DEG = 30/);
  assert.match(helper, /QUICK_ESTIMATE_SCHEME_ROOF_OVERHANG_MM = 200/);
  assert.match(helper, /QUICK_ESTIMATE_SCHEME_WALL_THICKNESS_MM = 400/);
  assert.match(helper, /QUICK_ESTIMATE_SCHEME_RIDGE_DISTANCE_MM = 1500/);
  assert.match(helper, /Кровельный комплект: УПК AISI 430 по наружному диаметру \+ мастер-флеш по запросу/);
  assert.match(component, /useState<EquipmentStatus \| null>\("installed"\)/);
});

test("quick ceiling estimate subtracts the assumed heater and fixes the confirmed pipe kit", () => {
  assert.match(helper, /totalHeightMm - QUICK_ESTIMATE_HEATER_HEIGHT_MM - QUICK_ESTIMATE_WARMUP_PIPE_LENGTH_MM/);
  assert.match(helper, /answers\.floors - 1/);
  assert.match(helper, /line\.key === "rotary-damper"/);
  assert.match(helper, /thicknessProfile: "first-floor-0\.8"/);
  assert.match(helper, /thicknessProfile: "upper-outdoor-0\.5"/);
  assert.match(helper, /quick-first/);
  assert.match(helper, /quick-remaining/);
  assert.match(helper, /quantity: Math\.max\(0, sandwichQuantity - 1\)/);
  assert.match(helper, /answers\.route !== "ceiling" \|\| !answers\.hasAttic/);
  assert.match(component, /applyQuickEstimateBomRules\(bomForVariant/);
  assert.match(component, /if \(line\.thicknessProfile\)/);
  assert.match(component, /line\.materialPreference === "stainless-standard" \|\| line\.thicknessProfile/);
  assert.match(component, /line\.characteristics\.join\(" · "\)/);
  assert.doesNotMatch(component, /characteristics\.slice\(0, 2\)/);
});

test("quick estimate uses the existing catalog and keeps the public result self-contained", () => {
  assert.match(component, /\/api\/v1\/products/);
  assert.match(component, /buildChimneyEstimate/);
  assert.doesNotMatch(component, /saveConfiguratorDraft/);
  assert.doesNotMatch(component, /MEASUREMENTS_INTAKE_STORAGE_KEY/);
  assert.doesNotMatch(component, /useRouter/);
  assert.doesNotMatch(component, /\/zamery/);
});

test("price stays visible while the detailed BOM opens only after contact handoff", () => {
  assert.match(component, /estimate\.lines\.map/);
  assert.match(component, /Цена по запросу/);
  assert.match(component, /primary_image/);
  assert.match(component, /quickEstimateProductHref/);
  assert.match(component, /Открыть товар/);
  assert.match(component, /!leadSubmitted/);
  assert.match(component, /!leadSubmitted[\s\S]*inline[\s\S]*Показать схему и состав/);
  assert.match(component, /<EstimateLeadDialog/);
  assert.ok(
    component.indexOf("<EstimateLeadDialog") < component.indexOf("estimate.lines.map"),
    "contact form must be rendered before the protected BOM",
  );
  assert.match(component, /leadSource = "chimney-quick-estimate"/);
  assert.match(component, /source=\{leadSource\}/);
  assert.match(component, /METRIKA_GOALS\.quickEstimateContactSent/);
  assert.match(component, /onSubmitted=\{\(\) => setLeadSubmitted\(true\)\}/);
  assert.match(component, /estimate\.lines\.length\} позиций · \{estimate\.totalUnits\} изделий/);
  assert.ok(
    component.indexOf("styles.resultOverview") < component.indexOf("!leadSubmitted"),
    "price summary must be rendered before the contact gate",
  );
  assert.match(component, /Предварительная стоимость уже рассчитана/);
  assert.match(component, /Заявка получена/);
  assert.match(component, /Офис работает по будням с 9:00 до 17:00/);
  assert.match(component, /href=\{operator\.phoneHref\}/);
  assert.match(component, /downloadChimneyEstimatePdf/);
  assert.match(component, /Скачать смету PDF/);
});

test("public SVG scheme opens after contact handoff and reuses the professional renderer with isolated defaults", () => {
  assert.match(component, /leadSubmitted[\s\S]*<QuickEstimateScheme[\s\S]*calculation=\{schemeCalculation\}/);
  assert.ok(
    component.indexOf("<EstimateLeadDialog") < component.indexOf("<QuickEstimateScheme"),
    "contact form must precede the public SVG scheme",
  );
  assert.match(quickScheme, /Предварительная схема дымохода/);
  assert.match(quickScheme, /GeneratedChimneyScheme/);
  assert.match(quickScheme, /variant=\{calculation\.selectedVariant\}/);
  assert.match(quickScheme, /presentation="public"/);
  assert.match(readFileSync(new URL("../components/ChimneyConfigurator.tsx", import.meta.url), "utf8"), /PublicFacadeChimneyScheme/);
  assert.match(readFileSync(new URL("../components/ChimneyConfigurator.tsx", import.meta.url), "utf8"), /data-public-console="upper-roof"/);
  assert.match(helper, /quickEstimateSchemeRidgeHeightMm/);
  assert.match(helper, /3500 \+ Math\.max\(0, answers\.floors - 1\) \* 3000 \+ \(answers\.hasAttic \? 1500 : 0\)/);
  assert.match(component, /const schemeCalculation = useMemo/);
  assert.match(component, /const schemeDraft = quickEstimateSchemeDraft\(answers\)/);
  assert.match(component, /applyQuickEstimateBomRules\(bomForVariant\(calculation/);
});

test("mobile object choices use two full-width rows", () => {
  const styles = readFileSync(new URL("../components/HomeQuickEstimate.module.css", import.meta.url), "utf8");
  assert.match(component, /styles\.objectChoices/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*\.objectChoices \{ grid-template-columns: 1fr; \}/);
});

test("quick result remains explicitly preliminary without a fixed accuracy promise", () => {
  assert.doesNotMatch(component, /±30%/);
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
  assert.match(component, /line\.key === "roof-master-flash"/);
  assert.match(component, /q: "Мастер-флеш"/);
  assert.match(component, /params\.set\("preferred_diameter", `:\$\{diameter \+ 100\}`\)/);
  assert.match(component, /line\.preferredSteelGrade/);
  assert.match(component, /setMatches\(saved\.matches\)/);
  assert.match(component, /setStep\(4\)/);
  assert.match(component, /from=quick-estimate/);
  assert.match(productPage, /returnToQuickEstimate=\{fromQuickEstimate\}/);
  assert.match(productExperience, /Вернуться к расчёту/);
  assert.match(productExperience, /\/bystryy-raschet#quick-estimate/);
});
