import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateMinimumTerminationHeight,
} from "./chimneyTermination.ts";

const base = {
  roofType: "pitched",
  ridgeHeightMm: 5200,
  ridgeHorizontalDistanceMm: 1000,
  roofOuterHeightAtChimneyMm: 4300,
};

test("raises the mouth 500 mm above the ridge within 1.5 m", () => {
  const result = calculateMinimumTerminationHeight(base);
  assert.equal(result.roofRule, "ridge-plus-500");
  assert.equal(result.roofRequirementMm, 5700);
  assert.equal(result.minimumHeightMm, 5700);
});

test("keeps the mouth at ridge level from 1.5 m through 3 m", () => {
  const result = calculateMinimumTerminationHeight({
    ...base,
    ridgeHorizontalDistanceMm: 2400,
  });
  assert.equal(result.roofRule, "ridge-level");
  assert.equal(result.roofRequirementMm, 5200);
  assert.equal(result.minimumHeightMm, 5200);
});

test("uses the descending 10 degree line beyond 3 m", () => {
  const result = calculateMinimumTerminationHeight({
    ...base,
    ridgeHorizontalDistanceMm: 4000,
  });
  assert.equal(result.roofRule, "ridge-ten-degree-line");
  assert.equal(result.tenDegreeLineHeightAtChimneyMm, 4495);
  assert.equal(result.minimumHeightMm, 4495);
});

test("uses 500 mm above the local outer surface for a flat roof", () => {
  const result = calculateMinimumTerminationHeight({
    ...base,
    roofType: "flat",
    ridgeHeightMm: null,
    ridgeHorizontalDistanceMm: null,
  });
  assert.equal(result.roofRule, "flat-roof-plus-500");
  assert.equal(result.minimumHeightMm, 4800);
});
