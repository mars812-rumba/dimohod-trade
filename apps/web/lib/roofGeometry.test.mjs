import assert from "node:assert/strict";
import test from "node:test";

import { calculatePitchedRoofPassage } from "./roofGeometry.ts";

test("anchors a pitched roof passage to the measured inner ridge datum", () => {
  const passage = calculatePitchedRoofPassage({
    ridgeInnerHeightMm: 3500,
    chimneyToRidgeHorizontalMm: 300,
    roofAngleDeg: 37,
    roofThicknessAlongChimneyMm: 200,
  });

  assert.deepEqual(passage, {
    innerHeightAtChimneyMm: 3274,
    outerHeightAtChimneyMm: 3474,
  });
});

test("does not invent geometry when a required measurement is missing", () => {
  assert.equal(calculatePitchedRoofPassage({
    ridgeInnerHeightMm: 3500,
    chimneyToRidgeHorizontalMm: null,
    roofAngleDeg: 37,
    roofThicknessAlongChimneyMm: 200,
  }), null);
});
