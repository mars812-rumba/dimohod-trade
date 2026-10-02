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
  assert.equal(calculation.bom.some((line) => line.key === "wall-clamp"), false);
  assert.equal(calculation.bom.some((line) => line.label === "Одноконтурный хомут широкий"), false);
  const teeLowerPipe = calculation.bom.find((line) => line.key === "tee-lower-sandwich-pipe-250");
  assert.equal(calculation.bom.find((line) => line.key === "wall-passage").fixedUnitPriceRub, 600);
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
  const routePipes = bom.filter((line) => (
    line.key.startsWith("sandwich-pipe-") || line.key.startsWith("single-layout-pipe-")
  ));

  assert.equal(keys.some((key) => key.startsWith("single-layout-pipe-")), false);
  assert.ok(routePipes.every((line) => line.nominalLengthMm === 1000));
  assert.equal(bom.find((line) => line.key === "tee-lower-sandwich-pipe-250").nominalLengthMm, 250);
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
  assert.equal(calculation.bom.find((line) => line.key === "ceiling-passage").fixedUnitPriceRub, 600);
  assert.deepEqual(calculation.bom.slice(0, 3).map((line) => line.key), [
    "single-pipe-1000",
    "rotary-damper",
    "support-cap",
  ]);
  assert.ok(calculation.selectedVariant.pipes.every((pipe) => pipe.nominalMm === 1000));
});

test("rear outlet through a ceiling keeps the confirmed warm transition order", () => {
  const calculation = calculateChimney({
    route: "ceiling",
    outlet: "horizontal",
    floors: 1,
    heightM: 4,
    distanceM: 0,
    roofType: "flat",
    draft: {
      levels: "1",
      diameter: "120",
      connectionHeight: "0",
      ceilingHeight: "2400",
      floorThickness: "200",
      roofThickness: "200",
      ridgeHeight: "3600",
    },
  });
  const keys = calculation.bom.map((line) => line.key);
  const firstSandwichIndex = keys.findIndex((key) => key.startsWith("sandwich-pipe-"));

  assert.deepEqual(keys.slice(0, 4), [
    "rotary-damper",
    "ceiling-rear-elbow-90",
    "single-pipe-1000",
    "support-cap",
  ]);
  assert.ok(keys.indexOf("support-cap") < firstSandwichIndex);
  assert.equal(calculation.bom.find((line) => line.key === "ceiling-rear-elbow-90").thicknessProfile, "first-floor-0.8");
  assert.equal(calculation.bom.find((line) => line.key === "single-pipe-1000").catalogLengthMode, "exact");
  assert.equal(calculation.bom.find((line) => line.key === "roof-passage").preferredSteelGrade, "AISI 430");
  assert.equal(calculation.bom.find((line) => line.key === "roof-master-flash").priceOnRequest, true);
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
  const placedSandwich = calculation.selectedVariant.pipes.filter((pipe) => pipe.contour === "сэндвич");

  assert.equal(placedSandwich.filter((pipe) => pipe.thicknessProfile === "first-floor-0.8").length, 1);
  assert.ok(placedSandwich.slice(1).every((pipe) => pipe.thicknessProfile === "upper-outdoor-0.5"));
  assert.equal(sandwich.find((line) => line.thicknessProfile === "first-floor-0.8").quantity, 1);
  assert.ok(sandwich.some((line) => line.thicknessProfile === "upper-outdoor-0.5"));
});

test("rear and top wall routes keep only their first sandwich pipe at 0.8 mm", () => {
  for (const outlet of ["horizontal", "vertical"]) {
    const calculation = calculateChimney({
      route: "wall",
      outlet,
      floors: 1,
      heightM: 5,
      distanceM: 0.5,
      roofType: "flat",
      draft: {
        levels: "1",
        diameter: "115",
        wallDistance: "500",
        wallThickness: "200",
        roofOverhang: "0",
        outdoorHeight: "5",
      },
    });
    const sandwich = calculation.selectedVariant.pipes.filter((pipe) => pipe.contour === "сэндвич");
    const outdoorSandwich = sandwich.filter((pipe) => pipe.axis === "vertical" && pipe.zone === "outdoor");
    const horizontalSandwich = sandwich.filter((pipe) => pipe.axis === "horizontal");

    assert.equal(calculation.errors.length, 0);
    assert.equal(horizontalSandwich.length, 1);
    assert.equal(outdoorSandwich.length, 5);
    assert.equal(sandwich.filter((pipe) => pipe.thicknessProfile === "first-floor-0.8").length, 1);
    assert.ok(outdoorSandwich.every((pipe) => pipe.thicknessProfile === "upper-outdoor-0.5"));
    assert.equal(
      calculation.bom.find((line) => line.key === "sandwich-pipe-1000-upper-outdoor").quantity,
      5,
    );
  }
});

test("passage consumables and decorative skirts follow the confirmed quantities", () => {
  const calculation = calculateChimney({
    route: "ceiling",
    outlet: "vertical",
    floors: 2,
    heightM: 7,
    distanceM: 0,
    roofType: "flat",
    draft: {
      levels: "2",
      hasAttic: true,
      diameter: "115",
      connectionHeight: "0",
      ceilingHeight: "2400",
      floorThickness: "200",
      secondCeilingHeight: "2400",
      secondFloorThickness: "200",
      atticHeight: "1500",
      roofThickness: "200",
      ridgeHeight: "6500",
      passageWoolKits: "17",
    },
  });
  const skirts = calculation.bom.filter((line) => line.productKind === "декоративная_юбка");

  assert.equal(calculation.bom.find((line) => line.key === "passage-insulation").quantity, 2);
  assert.equal(calculation.bom.find((line) => line.key === "floor-clamp").quantity, 1);
  assert.equal(skirts.reduce((sum, line) => sum + line.quantity, 0), 3);
  assert.equal(calculation.passageWoolKits, 2);
});

test("wall passage gets one wool kit and only the interior decorative skirt", () => {
  const calculation = wallRearCalculation();

  assert.equal(calculation.bom.find((line) => line.key === "passage-insulation").quantity, 1);
  assert.equal(calculation.bom.find((line) => line.key === "wall-decorative-skirt-interior").quantity, 1);
  assert.equal(calculation.bom.some((line) => line.key === "wall-decorative-skirt-exterior"), false);
});

test("top wall route marks the single-wall elbow as 0.8 mm", () => {
  const calculation = calculateChimney({
    route: "wall",
    outlet: "vertical",
    floors: 1,
    heightM: 5,
    distanceM: 1.2,
    roofType: "flat",
    draft: {
      levels: "1",
      diameter: "115",
      wallDistance: "1200",
      wallThickness: "200",
      roofOverhang: "0",
      outdoorHeight: "5",
    },
  });

  assert.equal(calculation.bom.find((line) => line.key === "top-outlet-elbow").thicknessProfile, "first-floor-0.8");
});
