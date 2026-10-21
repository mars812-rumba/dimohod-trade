import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { calculatePitchedRoofPassage } from "./roofGeometry.ts";
import { calculateMinimumTerminationHeight } from "./chimneyTermination.ts";
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

test("roof flange is the approved angled 600×750 while floor flanges stay 600×600", async () => {
  const result = ceiling();
  const roof = result.bom.find(line => line.key === "roof-interior-flange");
  assert.equal(roof.catalogBaseSize, "600×750 мм");
  assert.equal(roof.catalogExecution, "Под углом");
  assert.equal(roof.catalogCategorySlug, "flantsy");
  assert.equal(roof.preferredSteelGrade, "AISI 430");
  assert.equal(roof.quantity, 1);
  const floor = result.bom.find(line => line.key === "passage-flange");
  assert.equal(floor.catalogBaseSize, "600×600 мм");
  assert.equal(floor.catalogExecution, undefined);
  const ui = await readFile(new URL("../components/ChimneyConfigurator.tsx", import.meta.url), "utf8");
  assert.match(ui, /params\.set\("execution", line\.catalogExecution\)/);
  assert.match(ui, /line\.catalogExecution \?\? null/);
});

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

test("roof conflicts also keep a preliminary estimate and require correction", () => {
  for (const draft of [
    { ceilingHeight: "2400", floorThickness: "300", roofThickness: "300" },
    { ceilingHeight: "1700", floorThickness: "100", roofThickness: "200" },
  ]) {
    const result = ceiling(draft);
    assert.equal(result.status, "needs_review");
    assert.ok(result.selectedVariant);
    assert.deepEqual(result.errors, []);
    assert.ok(result.roofJointReviewItems.length);
    assert.ok(result.roofJointReviewItems.every((item) => result.reviewItems.includes(item)));
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

test("roof review is opt-in and never relaxes a wall passage", () => {
  for (const kind of ["floor", "roof", "wall"]) {
    const forbiddenZones = [{ id: kind, label: kind, axis: "vertical", startMm: 900, endMm: 1000, kind }];
    const variants = solvePipeLayouts({ axis: "vertical", startMm: 0, targetMm: 2000,
      fallbackZone: "indoor_warm", forbiddenZones, floorJointsRequireReview: true, roofJointsRequireReview: true });
    assert.equal(variants.length, kind === "wall" ? 0 : 1);
  }
});

test("the owner's exact measurements keep pipe quantities and flag the 2990 mm roof joint", () => {
  const calculateActual = new Function(
    "calculateMinimumTerminationHeight", "calculatePitchedRoofPassage",
    "wallRouteConsoleQuantity", "wallRouteFacadeConsolePositions", "wallTopRouteFacadeConsoleQuantity",
    "CHIMNEY_ENGINEERING_RULES", `${executable}\nreturn calculateChimney;`,
  )(calculateMinimumTerminationHeight, calculatePitchedRoofPassage,
    wallRouteConsoleQuantity, wallRouteFacadeConsolePositions, wallTopRouteFacadeConsoleQuantity,
    CHIMNEY_ENGINEERING_RULES);
  const result = calculateActual({ route: "ceiling", outlet: "vertical", floors: 1,
    heightM: 4, distanceM: 1, roofType: "pitched", draft: {
      connectionHeight: "900", diameter: "100", levels: "1", ceilingHeight: "2400",
      floorThickness: "200", ridgeHeight: "3500", ridgeHorizontalDistance: "1400",
      roofAngle: "30", roofThickness: "300", hasAttic: true, atticHeight: "1300",
    } });
  assert.deepEqual(result.errors, []);
  assert.equal(result.status, "needs_review");
  assert.equal(result.routeTargetMm, 4000);
  assert.deepEqual(result.selectedVariant.jointPositionsMm, [2990, 3940, 4890]);
  assert.equal(result.selectedVariant.pipes.length, 3);
  assert.deepEqual(result.floorJointReviewItems, []);
  assert.equal(result.roofJointReviewItems.length, 1);
  assert.match(result.roofJointReviewItems[0], /2990 мм.*2692–2992 мм/);
  assert.ok(result.reviewItems.includes(result.roofJointReviewItems[0]));
  assert.ok(result.bom.some((line) => line.key.startsWith("sandwich-pipe-")));
});

test("roof warning is visible before requesting the estimate", async () => {
  const ui = await readFile(new URL("../components/ChimneyConfigurator.tsx", import.meta.url), "utf8");
  assert.ok(ui.indexOf("Проверить стыки в кровельном проходе перед заказом") < ui.indexOf("{!estimateUnlocked ? ("));
  assert.match(ui, /calculation\.roofJointReviewItems\.map/);
});
