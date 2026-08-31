import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const cartSource = fs.readFileSync(path.join(here, "cart.ts"), "utf8");
const cartPageSource = fs.readFileSync(path.join(here, "../components/CartPage.tsx"), "utf8");
const productSource = fs.readFileSync(path.join(here, "../components/ProductExperience.tsx"), "utf8");
const catalogCardSource = fs.readFileSync(path.join(here, "../components/CatalogProductCard.tsx"), "utf8");
const headerSource = fs.readFileSync(path.join(here, "../components/SiteHeader.tsx"), "utf8");

test("cart is versioned, bounded, and synchronized through localStorage", () => {
  assert.match(cartSource, /dimohod_trade_cart_v1/);
  assert.match(cartSource, /version: 1/);
  assert.match(cartSource, /slice\(0, 100\)/);
  assert.match(cartSource, /Math\.min\(999/);
  assert.match(cartSource, /useSyncExternalStore/);
  assert.match(cartSource, /window\.addEventListener\("storage"/);
});

test("catalog and product variants add exact SKU snapshots", () => {
  assert.match(productSource, /<CartAddButton/);
  assert.match(productSource, /skuId: activeSku\.id/);
  assert.match(catalogCardSource, /product\.selected_sku_id/);
  assert.match(catalogCardSource, /<CartAddButton/);
});

test("cart submits the existing structured estimate flow", () => {
  assert.match(cartPageSource, /<EstimateLeadDialog/);
  assert.match(cartPageSource, /source="catalog-cart"/);
  assert.match(cartPageSource, /matchStatus: "exact"/);
  assert.match(cartPageSource, /clearCart\(\)/);
});

test("header exposes the cart on desktop and mobile", () => {
  assert.match(headerSource, /<CartHeaderLink \/>/);
  assert.match(headerSource, /<CartHeaderLink mobile onClick=\{closeMenu\} \/>/);
});
