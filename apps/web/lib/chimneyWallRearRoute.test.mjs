import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

import {
  wallRouteConsoleQuantity,
  wallRouteFacadeConsolePositions,
  wallTopRouteFacadeConsoleQuantity,
} from "./wallRouteLayout.ts";
import { CHIMNEY_ENGINEERING_RULES } from "./configuratorEngineeringRules.ts";

const source = await readFile(new URL("./chimneyCalculation.ts", import.meta.url), "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const executable = transpiled
  .replace(/^import .*;\n/gmu, "")
  .replace(/\bexport\s+/gu, "");

const { calculateChimney, bomForVariant } = new Function(
  "calculateMinimumTerminationHeight",
  "calculatePitchedRoofPassage",
  "wallRouteConsoleQuantity",
  "wallRouteFacadeConsolePositions",
  "wallTopRouteFacadeConsoleQuantity",
  "CHIMNEY_ENGINEERING_RULES",
  `${executable}\nreturn { calculateChimney, bomForVariant };`,
)(
  () => null,
  () => null,
  wallRouteConsoleQuantity,
  wallRouteFacadeConsolePositions,
  wallTopRouteFacadeConsoleQuantity,
  CHIMNEY_ENGINEERING_RULES,
);

function wallRearCalculation() {
  return calculateChimney({
    route: "wall",
    outlet: "horizontal",
    floors: 1,
    heightM: 3,
    distanceM: 1.2,
    roofType: "flat",
    rotaryDamperHeightMm: 130,
    supportCapLengthMm: 70,
    draft: {
      levels: "1",
      diameter: "100",
      wallDistance: "1200",
      wallThickness: "200",
      roofOverhang: "0",
      outdoorHeight: "3",
    },
  });
}

test("rear wall route starts with damper and support cap, then uses sandwich pipes only", () => {
  const calculation = wallRearCalculation();

  assert.deepEqual(calculation.errors, []);
  assert.deepEqual(
    calculation.fixedParts.filter((part) => part.axis === "horizontal").map((part) => [part.id, part.startMm, part.endMm]),
    [["rotary_damper", 0, 150], ["support_cap", 150, 190]],
  );
  assert.ok(calculation.selectedVariant.pipes.filter((pipe) => pipe.axis === "horizontal").every((pipe) => pipe.contour === "сэндвич"));
  assert.equal(calculation.selectedVariant.pipes.find((pipe) => pipe.axis === "horizontal").nominalMm, 1000);
  assert.equal(calculation.bom.some((line) => line.key.startsWith("single-layout-pipe-")), false);
  assert.equal(calculation.bom.some((line) => line.key === "support-cap"), true);
  assert.equal(calculation.bom.some((line) => line.key === "outside-support-platform"), true);
  assert.equal(calculation.bom.some((line) => line.key === "tee-support-console"), true);
  const teeLowerPipe = calculation.bom.find((line) => line.key === "tee-lower-sandwich-pipe-250");
  assert.deepEqual(
    {
      nominalLengthMm: teeLowerPipe.nominalLengthMm,
      contour: teeLowerPipe.contour,
      thicknessProfile: teeLowerPipe.thicknessProfile,
      preferredSteelGrade: teeLowerPipe.preferredSteelGrade,
      preferredOuterSteelGrade: teeLowerPipe.preferredOuterSteelGrade,
    },
    {
      nominalLengthMm: 250,
      contour: "сэндвич",
      thicknessProfile: "upper-outdoor-0.5",
      preferredSteelGrade: "AISI 304",
      preferredOuterSteelGrade: "AISI 430",
    },
  );
});

test("both wall routes keep a 1000 mm first sandwich pipe even when a short pipe would cover the run", () => {
  for (const outlet of ["horizontal", "vertical"]) {
    const calculation = calculateChimney({
      route: "wall",
      outlet,
      floors: 1,
      heightM: 3,
      distanceM: 0.4,
      roofType: "flat",
      draft: {
        levels: "1",
        diameter: "100",
        wallDistance: "400",
        wallThickness: "200",
        roofOverhang: "0",
        outdoorHeight: "3",
      },
    });
    const horizontalPipes = calculation.selectedVariant.pipes.filter((pipe) => pipe.axis === "horizontal");

    assert.equal(calculation.errors.length, 0);
    assert.deepEqual(horizontalPipes.map((pipe) => pipe.nominalMm), [1000]);
  }
});

test("variant BOM keeps transition order and contains no single-wall pipe", () => {
  const calculation = wallRearCalculation();
  const bom = bomForVariant(calculation, calculation.selectedVariant);
  const keys = bom.map((line) => line.key);
  const firstSandwichPipeIndex = keys.findIndex((key) => key.startsWith("sandwich-pipe-"));

  assert.equal(keys.some((key) => key.startsWith("single-layout-pipe-")), false);
  assert.ok(keys.indexOf("rear-connection-rotary-damper") < keys.indexOf("support-cap"));
  assert.ok(keys.indexOf("support-cap") < firstSandwichPipeIndex);
});

test("top wall route uses the confirmed fixed 1000 mm single-wall rise", () => {
  const calculation = calculateChimney({
    route: "wall",
    outlet: "vertical",
    floors: 1,
    heightM: 7,
    distanceM: 0.5,
    roofType: "flat",
    rotaryDamperHeightMm: 130,
    supportCapLengthMm: 70,
    draft: {
      levels: "1",
      diameter: "100",
      verticalRise: "700",
      wallDistance: "500",
      wallThickness: "300",
      roofOverhang: "198",
      outdoorHeight: "7",
    },
  });

  const indoorPipes = calculation.selectedVariant.pipes.filter((pipe) => (
    pipe.axis === "vertical" && pipe.contour === "одностенный"
  ));
  const horizontalPipes = calculation.selectedVariant.pipes.filter((pipe) => pipe.axis === "horizontal");

  assert.equal(calculation.indoorRiseMm, 950);
  assert.equal(indoorPipes.reduce((sum, pipe) => sum + pipe.effectiveMm, 0), 950);
  assert.deepEqual(indoorPipes.map((pipe) => pipe.nominalMm), [1000]);
  assert.deepEqual(
    calculation.fixedParts.filter((part) => part.axis === "horizontal").map((part) => [part.id, part.startMm, part.endMm]),
    [["elbow_90", 0, 50], ["rotary_damper", 50, 200], ["support_cap", 200, 240]],
  );
  assert.deepEqual(horizontalPipes.map((pipe) => [pipe.nominalMm, pipe.startMm, pipe.endMm]), [[1000, 240, 1190]]);
  assert.ok(horizontalPipes.every((pipe) => pipe.contour === "сэндвич"));
  assert.equal(horizontalPipes.some((pipe) => pipe.endMm > 500 && pipe.endMm < 800), false);
});

test("vertical route keeps the confirmed pipe, damper and support-cap effective lengths", () => {
  const calculation = calculateChimney({
    route: "ceiling",
    outlet: "vertical",
    floors: 1,
    heightM: 4,
    distanceM: 0,
    roofType: "flat",
    draft: {
      levels: "1",
      diameter: "115",
      connectionHeight: "0",
      ceilingHeight: "2400",
      floorThickness: "200",
      roofThickness: "200",
      ridgeHeight: "3600",
    },
  });

  assert.deepEqual(
    calculation.fixedParts.map((part) => [part.id, part.effectiveMm]),
    [["warmup", 950], ["rotary_damper", 150], ["support_cap", 40]],
  );
  assert.equal(calculation.fixedParts.some((part) => part.id === "elbow_90"), false);
});

test("BOM separates first sandwich 0.8 mm from upper and outdoor 0.5 mm pipes", () => {
  const calculation = calculateChimney({
    route: "ceiling",
    outlet: "vertical",
    floors: 2,
    heightM: 7,
    distanceM: 0,
    roofType: "flat",
    draft: {
      levels: "2",
      diameter: "115",
      connectionHeight: "0",
      ceilingHeight: "2400",
      floorThickness: "200",
      secondCeilingHeight: "2400",
      secondFloorThickness: "200",
      roofThickness: "200",
      ridgeHeight: "6500",
    },
  });
  const bom = bomForVariant(calculation, calculation.selectedVariant);
  const sandwich = bom.filter((line) => line.key.startsWith("sandwich-pipe-"));

  assert.ok(sandwich.some((line) => line.thicknessProfile === "first-floor-0.8"));
  assert.ok(sandwich.some((line) => line.thicknessProfile === "upper-outdoor-0.5"));
  assert.equal(calculation.selectedVariant.pipes.find((pipe) => pipe.contour === "сэндвич").thicknessProfile, "first-floor-0.8");
});
