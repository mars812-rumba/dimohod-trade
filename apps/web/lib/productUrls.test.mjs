import assert from "node:assert/strict";
import test from "node:test";

import { productSelectionPath } from "./productUrls.ts";

test("product URL keeps the selected sandwich pipe length", () => {
  assert.equal(
    productSelectionPath(
      "sendvich-truba",
      { diameter_mm: 100, outer_diameter_mm: 200, length_mm: 350 },
      "DT-SW50-21-03-D100-200",
    ),
    "/product/sendvich-truba-d100-200?sku=DT-SW50-21-03-D100-200&length=350",
  );
});

test("product URL keeps the selected single-wall pipe length", () => {
  assert.equal(
    productSelectionPath(
      "odnostennaya-truba",
      { diameter_mm: 100, outer_diameter_mm: null, length_mm: 500 },
      "DT-GOLYE-07-02-D100",
    ),
    "/product/odnostennaya-truba-d100?sku=DT-GOLYE-07-02-D100&length=500",
  );
});

test("non-length products keep their existing URL", () => {
  assert.equal(
    productSelectionPath(
      "sendvich-troinik",
      { diameter_mm: 100, outer_diameter_mm: 200 },
      "DT-SW50-21-08-D100-200",
    ),
    "/product/sendvich-troinik-d100-200?sku=DT-SW50-21-08-D100-200",
  );
});
