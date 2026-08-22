import assert from "node:assert/strict";
import test from "node:test";

import { wallRearRoutePipePlan } from "./wallRouteLayout.ts";

test("uses four one-metre sandwich pipes for a five-metre outdoor route", () => {
  assert.deepEqual(wallRearRoutePipePlan(5000), {
    connectionPipeNominalMm: 1000,
    outdoorPipeNominalMm: 1000,
    outdoorPipeQuantity: 4,
  });
});
