import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./estimateDiscount.ts", import.meta.url), "utf8");
const executable = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText.replace(/\bexport\s+/gu, "");
const discount = new Function(`${executable};return estimateDiscount;`)();

test("discount is rounded once to kopecks and subtracted from the subtotal", () => {
  assert.deepEqual(discount(60251.53, true, 10), {discountAmountRub:6025.15,totalAfterDiscountRub:54226.38});
  assert.deepEqual(discount(9601, true, 12.55), {discountAmountRub:1204.93,totalAfterDiscountRub:8396.07});
  assert.deepEqual(discount(0.05, true, 10), {discountAmountRub:0.01,totalAfterDiscountRub:0.04});
});
test("zero, full and disabled discounts", () => {
  assert.equal(discount(9601,true,100).totalAfterDiscountRub,0);
  assert.equal(discount(9601,true,0).totalAfterDiscountRub,9601);
  assert.equal(discount(9601,false,10).totalAfterDiscountRub,9601);
});
test("invalid discounts never produce a payable total", () => {
  for(const value of [-1,101,NaN,Infinity,1.234]) assert.throws(()=>discount(9601,true,value));
});
