import assert from "node:assert/strict";
import test from "node:test";

import {
  wallRearRouteConsoleQuantity,
  wallRearRoutePipePlan,
  wallRouteConsoleQuantity,
} from "./wallRouteLayout.ts";

test("uses four one-metre sandwich pipes for a five-metre outdoor route", () => {
  assert.deepEqual(wallRearRoutePipePlan(5000), {
    connectionPipeNominalMm: 1000,
    outdoorPipeNominalMm: 1000,
    outdoorPipeQuantity: 4,
  });
});

test("uses five one-metre sandwich pipes for a six-metre outdoor route", () => {
  assert.deepEqual(wallRearRoutePipePlan(6000), {
    connectionPipeNominalMm: 1000,
    outdoorPipeNominalMm: 1000,
    outdoorPipeQuantity: 5,
  });
});

test("adds one tee support plus one console for every two metres of outdoor pipes", () => {
  assert.equal(wallRearRouteConsoleQuantity(4, 1000), 3);
  assert.equal(wallRearRouteConsoleQuantity(5, 1000), 4);
  assert.equal(wallRouteConsoleQuantity(4000), 3);
  assert.equal(wallRouteConsoleQuantity(5000), 4);
});
