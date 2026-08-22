import assert from "node:assert/strict";
import test from "node:test";

import {
  wallRouteFacadeConsolePositions,
  wallRearRouteConsoleQuantity,
  wallRearRoutePipePlan,
  wallRouteConsoleQuantity,
  wallTopRouteUpperConsolePositions,
  wallTopRouteUpperConsoleQuantity,
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

test("places facade console and power-clamp pairs at intervals no longer than two metres", () => {
  assert.deepEqual(wallRouteFacadeConsolePositions(0), []);
  assert.deepEqual(wallRouteFacadeConsolePositions(4000), [2000, 4000]);
  assert.deepEqual(wallRouteFacadeConsolePositions(5000), [2000, 4000, 5000]);
});

test("wall-top route gets one upper console only when the outdoor stack reaches two metres", () => {
  assert.deepEqual(wallTopRouteUpperConsolePositions(1999), []);
  assert.deepEqual(wallTopRouteUpperConsolePositions(2000), [2000]);
  assert.deepEqual(wallTopRouteUpperConsolePositions(5000), [5000]);
  assert.equal(wallTopRouteUpperConsoleQuantity(1999), 0);
  assert.equal(wallTopRouteUpperConsoleQuantity(5000), 1);
});
