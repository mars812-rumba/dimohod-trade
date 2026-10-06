import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { CHIMNEY_ENGINEERING_RULES } from "./configuratorEngineeringRules.ts";
import { wallRouteConsoleQuantity, wallRouteFacadeConsolePositions, wallTopRouteFacadeConsoleQuantity } from "./wallRouteLayout.ts";

const source = await readFile(new URL("./chimneyCalculation.ts", import.meta.url), "utf8");
const executable = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText.replace(/^import .*;\n/gmu, "").replace(/\bexport\s+/gu, "");
const { calculateChimney, solvePipeLayouts } = new Function(
  "calculateMinimumTerminationHeight", "calculatePitchedRoofPassage",
  "wallRouteConsoleQuantity", "wallRouteFacadeConsolePositions", "wallTopRouteFacadeConsoleQuantity",
  "CHIMNEY_ENGINEERING_RULES",
  `${executable}\nreturn { calculateChimney, solvePipeLayouts };`,
)(() => null, () => null, wallRouteConsoleQuantity, wallRouteFacadeConsolePositions,
  wallTopRouteFacadeConsoleQuantity, CHIMNEY_ENGINEERING_RULES);

function ceiling(draft = {}) {
  return calculateChimney({
    route: "ceiling", outlet: "vertical", floors: 1, heightM: 6,
    distanceM: 1, roofType: "flat",
    draft: { diameter: "120", connectionHeight: "700", ceilingHeight: "2600", floorThickness: "300", ...draft },
  });
}

test("pipe joint in a floor keeps the estimate and requires manual correction", () => {
  const result = ceiling();
  assert.deepEqual(result.errors, []);
  assert.ok(result.selectedVariant);
  assert.ok(result.bom.some((line) => line.key.startsWith("sandwich-pipe-")));
  assert.equal(result.status, "needs_review");
  assert.ok(result.floorJointReviewItems.some((item) => item.includes("2790 мм")));
  for (const item of result.floorJointReviewItems) {
    assert.ok(result.reviewItems.includes(item));
    assert.match(item, /Стык трубы не может находиться внутри перекрытия/);
  }
});

test("fixed support cap in a floor no longer prevents a preliminary layout", () => {
  const result = ceiling({ ceilingHeight: "1800", floorThickness: "300" });
  assert.deepEqual(result.errors, []);
  assert.ok(result.selectedVariant);
  assert.ok(result.floorJointReviewItems.some((item) => item.includes("1840 мм")));
});

test("each floor is checked, and clean floor boundaries do not produce warnings", () => {
  const result = ceiling({ levels: "2", secondCeilingHeight: "2700", secondFloorThickness: "300" });
  assert.deepEqual(result.errors, []);
  assert.ok(result.floorJointReviewItems.some((item) => item.includes("Перекрытие 1")));
  assert.ok(result.floorJointReviewItems.some((item) => item.includes("Перекрытие 2")));
  assert.deepEqual(ceiling({ ceilingHeight: "2790", floorThickness: "300" }).floorJointReviewItems, []);
});

test("floor review never disables roof conflicts, including fixed components", () => {
  for (const draft of [
    { ceilingHeight: "2400", floorThickness: "300", roofThickness: "300" },
    { ceilingHeight: "1700", floorThickness: "100", roofThickness: "200" },
  ]) {
    const result = ceiling(draft);
    assert.equal(result.status, "invalid");
    assert.equal(result.selectedVariant, null);
    assert.ok(result.errors.length);
  }
});

test("solver stays strict by default and permits only floor review when opted in", () => {
  const base = { axis: "vertical", startMm: 0, targetMm: 2000, fallbackZone: "indoor_warm" };
  for (const kind of ["floor", "wall", "roof"]) {
    const forbiddenZones = [{ id: kind, label: kind, axis: "vertical", startMm: 900, endMm: 1000, kind }];
    assert.equal(solvePipeLayouts({ ...base, forbiddenZones }).length, 0);
    assert.equal(solvePipeLayouts({ ...base, forbiddenZones, floorJointsRequireReview: true }).length, kind === "floor" ? 1 : 0);
  }
});

test("floor warning is visible before the estimate unlock, with truthful variant labels", async () => {
  const ui = await readFile(new URL("../components/ChimneyConfigurator.tsx", import.meta.url), "utf8");
  assert.ok(ui.indexOf("Проверить стыки в перекрытиях перед заказом") < ui.indexOf("{!estimateUnlocked ? ("));
  assert.match(ui, /calculation\.floorJointReviewItems\.map/);
  assert.match(ui, /Предварительные раскладки труб/);
});

test("overlapping floor and roof zones still block roof joints", () => {
  const forbiddenZones = [
    { id: "floor", label: "floor", axis: "vertical", startMm: 900, endMm: 1000, kind: "floor" },
    { id: "roof", label: "roof", axis: "vertical", startMm: 920, endMm: 1020, kind: "roof" },
  ];
  assert.deepEqual(solvePipeLayouts({ axis: "vertical", startMm: 0, targetMm: 2000,
    fallbackZone: "indoor_warm", forbiddenZones, floorJointsRequireReview: true }), []);
});
