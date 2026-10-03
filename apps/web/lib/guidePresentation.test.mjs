import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import ts from "typescript";

const source = fs.readFileSync(new URL("./guidePresentation.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { guideDate, guideEstimateTotal } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("guide dates are stable across timezones", () => {
  assert.equal(guideDate("2026-08-31T03:11:04Z"), "31 августа 2026 г.");
});
test("a dated BOM totals quantities without inventing missing prices", () => {
  assert.equal(guideEstimateTotal([{ quantity: 2, unitPriceRub: 1200 }, { quantity: 3, unitPriceRub: 100 }]), 2700);
  for (const lines of [[], [{ quantity: 1, unitPriceRub: null }], [{ quantity: 0, unitPriceRub: 100 }], [{ quantity: 1, unitPriceRub: 0 }], [{ quantity: 1, unitPriceRub: NaN }]]) {
    assert.equal(guideEstimateTotal(lines), null);
  }
});
