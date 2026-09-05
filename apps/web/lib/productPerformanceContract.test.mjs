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
const productPageSource = fs.readFileSync(
  path.join(here, "../app/product/[slug]/page.tsx"),
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

test("the initial product payload contains a compact variant matrix", () => {
  assert.match(apiSource, /params\.set\("compact", "true"\)/);
  assert.match(routerSource, /compact: bool = Query\(default=False\)/);
  assert.match(routerSource, /include_content=not compact or sku_model\.id == source_sku\.id/);
  assert.match(routerSource, /compact_product_attributes\(extra_attributes\)/);
  assert.match(routerSource, /product_read\.compact_skus/);
  assert.match(routerSource, /sku_read\.id == source_sku\.id/);
  assert.match(apiSource, /export function productSkus/);
});

test("heavy SKU content loads only after a variant is selected", () => {
  assert.match(routerSource, /@router\.get\("\/\{slug\}\/sku\/\{sku_key\}"/);
  assert.match(experienceSource, /const \[skus, setSkus\] = useState\(initialSkus\)/);
  assert.match(experienceSource, /skuDetailRequests/);
  assert.match(experienceSource, /\/sku\/\$\{encodeURIComponent\(sku\.id\)\}/);
});

test("a diameter page exposes its diameter in the visible product heading", () => {
  assert.match(experienceSource, /function productHeading\(product: Product, sku: SKU \| null\)/);
  assert.match(experienceSource, /const skuH1 = productHeading\(product, activeSku\)/);
});

test("metadata and page rendering share one product request", () => {
  assert.match(productPageSource, /const getProductForPage = cache\(getProduct\)/);
  assert.equal((productPageSource.match(/getProductForPage\(/g) ?? []).length, 2);
});
