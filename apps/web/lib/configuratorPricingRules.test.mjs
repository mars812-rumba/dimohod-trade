import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

import { CHIMNEY_ENGINEERING_RULES } from "./configuratorEngineeringRules.ts";

const source = await readFile(new URL("./configuratorPricingRules.ts", import.meta.url), "utf8");
const executable = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
  .replace(/^import .*;\n/gmu, "")
  .replace(/\bexport\s+/gu, "");
const allocatePassageKitPrice = new Function(
  "CHIMNEY_ENGINEERING_RULES",
  `${executable}\nreturn allocatePassageKitPrice;`,
)(CHIMNEY_ENGINEERING_RULES);

test("allocates the cup remainder after two separately listed flanges", () => {
  const result = allocatePassageKitPrice(500);
  assert.equal(result.cupUnitPriceRub, 760);
  assert.equal(result.reviewItem, null);
  assert.match(result.explanation, /1760 ₽ − 2 × 500 ₽/u);
});

test("never exposes a negative cup price when catalog prices conflict", () => {
  const result = allocatePassageKitPrice(1672);
  assert.equal(result.cupUnitPriceRub, null);
  assert.match(result.reviewItem, /−1584 ₽/u);
});

test("requires an exact flange price before allocating the kit", () => {
  const result = allocatePassageKitPrice(null);
  assert.equal(result.cupUnitPriceRub, null);
  assert.match(result.reviewItem, /не найдена подтверждённая цена/u);
});
