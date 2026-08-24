import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

import {
  wallRouteConsoleQuantity,
  wallRouteFacadeConsolePositions,
  wallTopRouteFacadeConsoleQuantity,
} from "./wallRouteLayout.ts";

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
  `${executable}\nreturn { calculateChimney, bomForVariant };`,
)(
  () => null,
  () => null,
  wallRouteConsoleQuantity,
  wallRouteFacadeConsolePositions,
  wallTopRouteFacadeConsoleQuantity,
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
      facadeOffset: "100",
      outdoorHeight: "3",
    },
  });
}

test("rear wall route starts with damper and support cap, then uses sandwich pipes only", () => {
  const calculation = wallRearCalculation();

  assert.deepEqual(calculation.errors, []);
  assert.deepEqual(
    calculation.fixedParts.filter((part) => part.axis === "horizontal").map((part) => [part.id, part.startMm, part.endMm]),
    [["rotary_damper", 0, 130], ["support_cap", 130, 150]],
  );
  assert.ok(calculation.selectedVariant.pipes.filter((pipe) => pipe.axis === "horizontal").every((pipe) => pipe.contour === "сэндвич"));
  assert.equal(calculation.bom.some((line) => line.key.startsWith("single-layout-pipe-")), false);
  assert.equal(calculation.bom.some((line) => line.key === "support-cap"), true);
  assert.equal(calculation.bom.some((line) => line.key === "outside-support-platform"), true);
  assert.equal(calculation.bom.some((line) => line.key === "tee-support-console"), true);
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

test("top wall route exposes and lays out the measured 700 mm single-wall rise", () => {
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
      facadeOffset: "298",
      outdoorHeight: "7",
    },
  });

  const indoorPipes = calculation.selectedVariant.pipes.filter((pipe) => (
    pipe.axis === "vertical" && pipe.contour === "одностенный"
  ));
  const horizontalPipes = calculation.selectedVariant.pipes.filter((pipe) => pipe.axis === "horizontal");

  assert.equal(calculation.indoorRiseMm, 700);
  assert.equal(indoorPipes.reduce((sum, pipe) => sum + pipe.effectiveMm, 0), 700);
  assert.deepEqual(indoorPipes.map((pipe) => pipe.nominalMm), [350, 250, 250]);
  assert.deepEqual(
    calculation.fixedParts.filter((part) => part.axis === "horizontal").map((part) => [part.id, part.startMm, part.endMm]),
    [["rotary_damper", 0, 130], ["support_cap", 130, 150]],
  );
  assert.deepEqual(horizontalPipes.map((pipe) => [pipe.nominalMm, pipe.startMm, pipe.endMm]), [[1000, 150, 1100]]);
  assert.ok(horizontalPipes.every((pipe) => pipe.contour === "сэндвич"));
  assert.equal(horizontalPipes.some((pipe) => pipe.endMm > 500 && pipe.endMm < 800), false);
});
