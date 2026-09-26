import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function executableFunction(fileName, returnName, dependencies) {
  const source = await readFile(new URL(fileName, import.meta.url), "utf8");
  const executable = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText
    .replace(/^import .*;\n/gmu, "")
    .replace(/\bexport\s+/gu, "");
  const names = Object.keys(dependencies);
  return new Function(...names, `${executable}\nreturn ${returnName};`)(...names.map((name) => dependencies[name]));
}

const buildChimneyEstimate = await executableFunction(
  "./chimneyEstimate.ts",
  "buildChimneyEstimate",
  {},
);

const bom = [
  { key: "ceiling-passage", label: "Стакан", quantity: 1, selectionReason: "Комплект", requiresSku: true },
  { key: "passage-flange", label: "Фланец", quantity: 2, selectionReason: "Два фланца", requiresSku: true },
];

function match(key, price) {
  return {
    exactByFields: true,
    item: {
      article: key,
      name: key,
      price_rub: String(price),
      diameter_mm: null,
      outer_diameter_mm: null,
      length_mm: null,
      insulation_mm: null,
      material: null,
      steel_grade: null,
      wall_thickness_mm: null,
      attributes: {},
    },
  };
}

function estimate(flangePrice) {
  return buildChimneyEstimate({
    selectedBom: bom,
    matches: {
      "ceiling-passage": match("cup", 1760),
      "passage-flange": match("flange", flangePrice),
    },
    measurements: [],
    profileName: "Тест",
    removedLabels: [],
    reviewItems: [],
    calculationErrors: [],
  });
}

test("passage cup and decorative flange use their own catalog prices", () => {
  const result = estimate(500);
  assert.deepEqual(result.lines.map((line) => line.unitPriceRub), [1760, 500]);
  assert.equal(result.knownSubtotalRub, 2760);
});

test("a decorative flange stays priced when its catalog price exceeds the old kit total", () => {
  const result = estimate(1672);
  assert.deepEqual(result.lines.map((line) => line.unitPriceRub), [1760, 1672]);
  assert.equal(result.knownSubtotalRub, 5104);
  assert.deepEqual(result.reviewItems, []);
});
