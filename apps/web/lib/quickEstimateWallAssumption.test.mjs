import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function load(file, dependencies = {}) {
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", code)((name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected import ${name}`);
    return dependencies[name];
  }, module, module.exports);
  return module.exports;
}
const draft = load("./configuratorDraft.ts");
const quick = load("./homeQuickEstimate.ts", { "./configuratorDraft": draft });
const base = { objectType: "house", equipmentStatus: "installed", equipmentType: "pech", outlet: "top", diameterMm: 115, route: "wall", floors: 1, hasAttic: false, outdoorHeightM: 4, wallDistanceM: null };

test("unknown wall distance resolves to the owner-confirmed 500 mm in BOM and public scheme drafts", () => {
  assert.equal(quick.QUICK_ESTIMATE_WALL_DISTANCE_M, 0.5);
  assert.equal(quick.quickEstimateDraft(base).wallDistance, "500");
  assert.equal(quick.quickEstimateSchemeDraft(base).wallDistance, "500");
  assert.equal(quick.quickEstimateHeightM(base), 4);
  assert.match(quick.quickEstimateAssumptions(base).join("\n"), /0,5 м; уточним по замерам/);
});

test("known dimensions remain intact, rear outlet and ceiling route keep their existing meaning", () => {
  assert.equal(quick.quickEstimateDraft({ ...base, wallDistanceM: 0.75 }).wallDistance, "750");
  assert.equal(quick.quickEstimateDraft({ ...base, outlet: "rear" }).route, "wall-direct");
  const ceiling = quick.quickEstimateDraft({ ...base, route: "ceiling", floors: 2, hasAttic: true });
  assert.equal(ceiling.wallDistance, "");
  assert.equal(ceiling.levels, "2");
  assert.equal(ceiling.atticHeight, "1500");
  assert.doesNotMatch(quick.quickEstimateAssumptions({ ...base, route: "ceiling" }).join("\n"), /патрубка до стены/);
});
