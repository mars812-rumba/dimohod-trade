import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const apiSource = fs.readFileSync(path.join(here, "api.ts"), "utf8");
const experienceSource = fs.readFileSync(
  path.join(here, "../components/ProductExperience.tsx"),
  "utf8",
);
const routerSource = fs.readFileSync(
  path.join(here, "../../../backend/app/modules/products/router.py"),
  "utf8",
);
const serviceSource = fs.readFileSync(
  path.join(here, "../../../backend/app/modules/products/service.py"),
  "utf8",
);

test("the initial product request does not wait for compatible products", () => {
  assert.match(apiSource, /params\.set\("include_compatible", "false"\)/);
  assert.match(routerSource, /include_compatible: bool = Query\(default=True\)/);
});

test("compatibility loads on demand without speculative fan-out", () => {
  assert.doesNotMatch(experienceSource, /COMPATIBILITY_PREFETCH_LIMIT/);
  assert.doesNotMatch(experienceSource, /Promise\.allSettled/);
  assert.match(experienceSource, /Подбираем совместимые изделия/);
  assert.match(routerSource, /stale-while-revalidate=300/);
});

test("explicit family compatibility is narrowed before ORM hydration", () => {
  assert.match(serviceSource, /SKU\.diameter_mm\.in_\(source_diameters\)/);
  assert.match(serviceSource, /or_\(\*candidate_filters\)/);
});
