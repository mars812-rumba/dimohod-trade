// Exercise the saved calculation kernel against the actual recovery catalog.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import ts from "typescript";
import { calculatePitchedRoofPassage } from "../apps/web/lib/roofGeometry.ts";
import { calculateMinimumTerminationHeight } from "../apps/web/lib/chimneyTermination.ts";
import { CHIMNEY_ENGINEERING_RULES } from "../apps/web/lib/configuratorEngineeringRules.ts";
import { wallRouteConsoleQuantity, wallRouteFacadeConsolePositions, wallTopRouteFacadeConsoleQuantity } from "../apps/web/lib/wallRouteLayout.ts";

async function functions(file, names, dependencies = {}) {
  const source = await readFile(new URL(`../apps/web/lib/${file}`, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
    .replace(/^import .*;\n/gmu, "").replace(/\bexport\s+/gu, "");
  return new Function(...Object.keys(dependencies), `${code}; return {${names.join(",")}};`)(...Object.values(dependencies));
}

const { calculateChimney } = await functions("chimneyCalculation.ts", ["calculateChimney"], {
  calculatePitchedRoofPassage, calculateMinimumTerminationHeight, CHIMNEY_ENGINEERING_RULES,
  wallRouteConsoleQuantity, wallRouteFacadeConsolePositions, wallTopRouteFacadeConsoleQuantity,
});
const { buildChimneyEstimate } = await functions("chimneyEstimate.ts", ["buildChimneyEstimate"]);
const api = "http://127.0.0.1:8101";

async function catalog(params) {
  const response = await fetch(`${api}/api/v1/products?${params}`);
  assert.equal(response.status, 200);
  return (await response.json()).items;
}

async function match(line, diameter) {
  const p = new URLSearchParams({ limit: "24", product_kind: line.productKind });
  for (const [key, value] of Object.entries({ category: line.catalogCategorySlug, q: line.catalogSearch,
    base_size: line.catalogBaseSize, execution: line.catalogExecution, contour: line.contour,
    insulation_mm: line.insulationMm, length_mm: line.nominalLengthMm })) {
    if (value !== null && value !== undefined) p.set(key, String(value));
  }
  const kinds = ["труба", "отвод", "тройник", "заглушка", "оголовок", "шибер", "декоративная_юбка"];
  const exactByFields = kinds.includes(line.productKind) || Boolean(line.catalogDiameterMode);
  if (kinds.includes(line.productKind)) p.set("diameter", `${diameter}:${line.insulationMm === undefined ? "" : diameter + line.insulationMm * 2}`);
  if (line.catalogDiameterMode === "sandwich-outer-exact") p.set("diameter", `${diameter + 100}:`);
  if (line.catalogDiameterMode === "sandwich-outer-range") p.set("preferred_diameter", `:${diameter + 100}`);
  if (line.preferredSteelGrade || line.materialPreference === "stainless-standard") {
    p.set("material", "stainless");
    p.set("steel_grade", line.preferredSteelGrade ?? "AISI 304");
    if (line.contour === "сэндвич") {
      p.set("outer_material", "stainless");
      p.set("outer_steel_grade", line.preferredOuterSteelGrade ?? "AISI 430");
    }
    if (line.thicknessProfile) {
      p.set("wall_thickness_mm", line.thicknessProfile === "first-floor-0.8" ? "0.8" : "0.5");
      if (line.contour === "сэндвич") p.set("outer_wall_thickness_mm", "0.5");
    }
  }
  if (["отвод", "тройник"].includes(line.productKind)) p.set("angle_deg", "90");
  let items = await catalog(p);
  if (!items.length && line.productKind === "консоль" && line.catalogSearch) {
    items = await catalog(new URLSearchParams({ limit: "24", q: line.catalogSearch,
      preferred_diameter: `:${diameter + 100}` }));
  }
  let lengthMatch = "exact";
  if (!items.length && line.catalogLengthMode === "nearest" && line.nominalLengthMm) {
    p.delete("length_mm"); p.set("preferred_length_mm", String(line.nominalLengthMm));
    items = (await catalog(p)).filter(item => item.length_mm !== null).sort((a, b) =>
      Math.abs(a.length_mm - line.nominalLengthMm) - Math.abs(b.length_mm - line.nominalLengthMm));
    lengthMatch = "nearest";
  }
  return items[0] ? { item: items[0], exactByFields, lengthMatch } : null;
}

const results = [];
const diameters = process.argv.length > 2 ? process.argv.slice(2).map(Number) : [115];
assert.ok(diameters.every(value => Number.isInteger(value) && value > 0));
for (const diameter of diameters) {
for (const [name, route, outlet] of [["ceiling", "ceiling", "vertical"], ["wall-top", "wall", "vertical"], ["wall-rear", "wall", "horizontal"]]) {
  const calculation = calculateChimney({ route, outlet, floors: 1, heightM: route === "ceiling" ? 6 : 3,
    distanceM: 1.2, roofType: "flat", draft: { diameter: String(diameter), connectionHeight: "700",
      ceilingHeight: "2600", floorThickness: "300", wallDistance: "1200", wallThickness: "200",
      roofOverhang: "0", outdoorHeight: "3" } });
  const matches = {};
  const missing = [];
  for (const line of calculation.bom.filter(line => line.requiresSku)) {
    const found = await match(line, diameter);
    if (found) matches[line.key] = found;
    else missing.push({ key: line.key, label: line.label, priceOnRequest: Boolean(line.priceOnRequest) });
  }
  const estimate = buildChimneyEstimate({ selectedBom: calculation.bom, matches, measurements: [],
    profileName: "Recovery check", removedLabels: [], reviewItems: calculation.reviewItems,
    calculationErrors: calculation.errors });
  assert.ok(estimate.knownSubtotalRub > 0, `${name} did not price any real catalog items`);
  results.push({ diameter, route: name, errors: calculation.errors, lines: estimate.lines.length,
    matched: Object.keys(matches).length, missing, subtotal: Number(estimate.knownSubtotalRub.toFixed(2)),
    unpriced: estimate.unpricedLineCount, reviewItems: calculation.reviewItems });
}
}
await writeFile("/home/dimohod-recovery-runtime/calculation-check.json", JSON.stringify(results, null, 2) + "\n");
console.log(JSON.stringify(results, null, 2));
