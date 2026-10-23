import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { isDiameterClampProduct, clampDiameterVariants } from "./clampVariants.ts";

const current = { id: "d100", diameter_mm: 100, outer_diameter_mm: null, material: "Нержавеющая сталь",
  steel_grade: "AISI 430", wall_thickness_mm: "0.50", contour: "одностенный", length_mm: null,
  angle_deg: null, insulation_mm: null, attributes: {} };
const d250 = { ...current, id: "d250", diameter_mm: 250, material: "нержавеющая сталь" };

test("only the two requested clamp families expose diameter editing", () => {
  for (const slug of ["odnostennyi-krepezh-homut-shirokii", "odnostennyi-krepezh-homut-silovoi"]) assert.ok(isDiameterClampProduct({ slug }));
  for (const slug of ["homut-v-perekrytie", "sendvich-truba", "flanets-dekorativnyy"]) assert.ok(!isDiameterClampProduct({ slug }));
});

test("diameter options preserve material, steel, thickness and execution", () => {
  const unrelated = [
    { ...d250, material: "оцинковка" }, { ...d250, steel_grade: "AISI 304" },
    { ...d250, wall_thickness_mm: "0.8" }, { ...d250, attributes: { execution: "other" } },
    { ...d250, outer_diameter_mm: 350 }, { ...d250, diameter_mm: null },
  ];
  assert.deepEqual(clampDiameterVariants([current, ...unrelated, d250], current), [current, d250]);
  assert.deepEqual(clampDiameterVariants([current], current).map(sku => sku.diameter_mm), [100]);
});

// Execute the actual request-building block, including the product-kind guard
// that formerly omitted the diameter filter for крепеж.
const source = fs.readFileSync(new URL("../components/ChimneyConfigurator.tsx", import.meta.url), "utf8");
const start = source.indexOf("const exactDiameter = diameterKinds.has(line.productKind)");
const end = source.indexOf("if (line.preferredSteelGrade", start);
assert.ok(start > 0 && end > start);
const request = new Function("line", "diameter", "diameterKinds", `const params=new URLSearchParams();${source.slice(start,end)};return params;`);
const kinds = new Set(["труба", "отвод", "тройник", "заглушка", "оголовок", "шибер", "декоративная_юбка"]);

test("exact outer diameter is sent for accessory kinds, not just pipes", () => {
  for (const inner of [100, 110, 115, 120, 150, 200, 250, 300]) {
    const params = request({ productKind: "крепеж", catalogDiameterMode: "sandwich-outer-exact" }, inner, kinds);
    assert.equal(params.get("diameter"), `${inner + 100}:`);
    assert.equal(params.get("preferred_diameter"), null);
  }
});

test("ordinary pipe and ranged accessory diameter requests remain unchanged", () => {
  assert.equal(request({ productKind: "труба", insulationMm: 50 }, 150, kinds).get("diameter"), "150:250");
  assert.equal(request({ productKind: "труба" }, 150, kinds).get("diameter"), "150:");
  const ranged = request({ productKind: "консоль", catalogDiameterMode: "sandwich-outer-range" }, 150, kinds);
  assert.equal(ranged.get("preferred_diameter"), ":250");
  assert.equal(ranged.get("diameter"), null);
});

test("admin diameter selector uses an existing SKU and the protected replacement path", () => {
  const ui = fs.readFileSync(new URL("../components/ManagerEstimateCard.tsx", import.meta.url), "utf8");
  assert.match(ui, /label="Диаметр хомута"/);
  assert.match(ui, /clampDiameterVariants\(product\.skus,current\)/);
  assert.match(ui, /item\.diameter_mm===Number\(value\)/);
  assert.match(ui, /\/catalog\/items\/\$\{line.id\}/);
});
