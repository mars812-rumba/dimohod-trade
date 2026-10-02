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
  {
    key: "ceiling-passage",
    label: "Стакан",
    quantity: 1,
    selectionReason: "Комплект",
    requiresSku: true,
    fixedUnitPriceRub: 600,
  },
  { key: "passage-flange", label: "Фланец", quantity: 2, selectionReason: "Два фланца", requiresSku: true },
  { key: "roof-master-flash", label: "Мастер-флеш", quantity: 1, selectionReason: "Кровельный проход", requiresSku: true, priceOnRequest: true },
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
      "roof-master-flash": match("master-flash", 2300),
    },
    measurements: [],
    profileName: "Тест",
    removedLabels: [],
    reviewItems: [],
    calculationErrors: [],
  });
}

test("ceiling passage cup uses the confirmed fixed price and flange keeps its catalog price", () => {
  const result = estimate(500);
  assert.deepEqual(result.lines.map((line) => line.unitPriceRub), [600, 500, null]);
  assert.equal(result.knownSubtotalRub, 1600);
  assert.equal(result.unpricedLineCount, 1);
});

test("a decorative flange stays priced when its catalog price exceeds the old kit total", () => {
  const result = estimate(1672);
  assert.deepEqual(result.lines.map((line) => line.unitPriceRub), [600, 1672, null]);
  assert.equal(result.knownSubtotalRub, 3944);
  assert.deepEqual(result.reviewItems, []);
});
