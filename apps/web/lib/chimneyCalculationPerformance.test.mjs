import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./chimneyCalculation.ts", import.meta.url), "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const solverStart = transpiled.indexOf("export function solvePipeLayouts");
const solverEnd = transpiled.indexOf("function solvePipeLayoutEndingAtOrBefore", solverStart);
assert.notEqual(solverStart, -1);
assert.notEqual(solverEnd, -1);

const solverSource = transpiled
  .slice(solverStart, solverEnd)
  .replace("export function solvePipeLayouts", "function solvePipeLayouts");
const solvePipeLayouts = new Function(
  "PIPE_SOCKET_OVERLAP_MM",
  "PIPE_LENGTHS",
  "jointInsideForbiddenZone",
  "pipeZone",
  `${solverSource}\nreturn solvePipeLayouts;`,
)(50, [
  { nominalMm: 1000, effectiveMm: 950 },
  { nominalMm: 500, effectiveMm: 450 },
  { nominalMm: 350, effectiveMm: 300 },
  { nominalMm: 250, effectiveMm: 200 },
],
  (positionMm, zones) =>
    zones.find((zone) => positionMm > zone.startMm && positionMm < zone.endMm) ?? null,
  (startMm, endMm, zones, fallback) =>
    zones.some((zone) => startMm < zone.endMm && endMm > zone.startMm)
      ? "wall_or_ceiling_pass"
      : fallback,
);

test("20-metre pipe layout stays bounded instead of growing exponentially after six pipes", () => {
  const startedAt = performance.now();
  const variants = solvePipeLayouts({
    axis: "vertical",
    startMm: 0,
    targetMm: 20_000,
    forbiddenZones: [],
    fallbackZone: "outdoor",
    contour: "сэндвич",
    maxVariants: 3,
  });
  const elapsedMs = performance.now() - startedAt;

  assert.equal(variants.length, 3);
  assert.ok(variants.every((variant) => variant.coveredEndMm >= 20_000));
  assert.ok(elapsedMs < 250, `20-metre layout took ${elapsedMs.toFixed(1)} ms`);
});
