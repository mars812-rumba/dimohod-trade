import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const productRoute = new URL("../app/product/[slug]/", import.meta.url);
const page = readFileSync(new URL("page.tsx", productRoute), "utf8");

test("product content has no route loading boundary that hides it until JavaScript runs", () => {
  for (const route of ["../app/", "../app/product/", "../app/product/[slug]/"]) {
    assert.equal(existsSync(new URL(`${route}loading.tsx`, import.meta.url)), false);
  }
  assert.doesNotMatch(page, /<Suspense\b/);
});

test("server passes existing selected-variant recommendations without caching their prices", () => {
  assert.match(page, /await getCompatibleProducts\(product\.slug, initialSku\.id, \{ fresh: true \}\)/);
  assert.match(page, /compatible_products: compatibleProducts/);
  assert.match(page, /product=\{initialProduct\}/);
  assert.match(page, /\.catch\(\(\) => \{/);
  const api = readFileSync(new URL("api.ts", import.meta.url), "utf8");
  assert.match(api, /options\.fresh\s*\? \{ cache: "no-store" as const \}/);
});
