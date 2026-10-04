import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const css = fs.readFileSync(path.join(here, "../app/globals.css"), "utf8");
const product = fs.readFileSync(path.join(here, "../components/ProductExperience.tsx"), "utf8");
const productMobileStart = css.indexOf(
  "@media (max-width: 768px) {",
  css.indexOf(".product-page .product-back-link"),
);
const productMobileEnd = css.indexOf("\n.catalog-result-count", productMobileStart);
const productMobileCss = css.slice(productMobileStart, productMobileEnd);
const catalogMobileStart = css.lastIndexOf("@media (max-width: 768px) {");
const catalogMobileCss = css.slice(catalogMobileStart);

test("mobile product UI keeps text readable and lets long labels wrap", () => {
  assert.match(productMobileCss, /\.product-page \.yandex-rating-badge \{[\s\S]*?font-size: 12px;/);
  assert.match(productMobileCss, /\.product-page \.product-image-badge \{[\s\S]*?font-size: 12px;[\s\S]*?overflow-wrap: anywhere;[\s\S]*?white-space: normal;/);
  assert.match(productMobileCss, /\.product-page \.variant-group legend \{[\s\S]*?font-size: 12px;[\s\S]*?white-space: normal;/);
  assert.match(productMobileCss, /\.product-page \.delivery-row \{[\s\S]*?font-size: 13px;[\s\S]*?overflow-wrap: anywhere;/);
});

test("mobile empty product media does not consume most of the first screen", () => {
  assert.match(productMobileCss, /\.product-page \.product-image-placeholder \{[\s\S]*?height: 168px;[\s\S]*?font-size: 14px;/);
});

test("mobile catalog cards use readable facts and wrapping badges", () => {
  assert.match(catalogMobileCss, /\.catalog-page \.catalog-category-facts dt \{[\s\S]*?font-size: 12px;/);
  assert.match(catalogMobileCss, /\.catalog-page \.catalog-category-facts dd \{[\s\S]*?font-size: 13px;[\s\S]*?overflow-wrap: anywhere;/);
  assert.match(catalogMobileCss, /\.catalog-page \.catalog-product-image-badges \{[\s\S]*?flex-wrap: wrap;/);
  assert.match(catalogMobileCss, /\.catalog-page \.catalog-product-image-badges \.product-image-badge \{[\s\S]*?font-size: 12px;[\s\S]*?white-space: normal;/);
});

test("desktop variant panel separates the fixed price from scrollable content", () => {
  const start = css.indexOf("@media (min-width: 1025px) {", css.indexOf(".product-page .product-back-link"));
  const desktop = css.slice(start, css.indexOf("@media (max-width: 1024px) {", start));
  assert.match(desktop, /\.sku-panel \{[\s\S]*?display: flex;[\s\S]*?max-height: calc\(100dvh - 108px\);/);
  assert.match(desktop, /\.sku-panel-scroll \{[\s\S]*?min-height: 0;[\s\S]*?overflow-y: auto;/);
  assert.match(desktop, /\.sku-cta \{[\s\S]*?position: sticky;[\s\S]*?bottom: 0;/);
  assert.match(desktop, /\.variant-group legend \{[\s\S]*?min-height: 28px;/);
  assert.ok(product.indexOf('className="sku-price-block sku-price-block-selection"') < product.indexOf('className="sku-panel-scroll"'));
  assert.match(product, /key: "material", label: "Внут\. труба"/);
  assert.match(product, /key: "attribute:outer_material", label: "Наруж\. труба"/);
});

test("product actions use explicit roles rather than the first button's position", () => {
  assert.match(product, /className="button full-button product-request-cta"/);
  assert.match(product, /className="button secondary full-button product-kit-cta"/);
  assert.match(css, /\.product-page \.sku-cta \.product-request-cta \{[\s\S]*?background: var\(--product-steel-deep\);/);
  assert.match(css, /\.product-page \.sku-cta \.product-kit-cta \{[\s\S]*?background: var\(--product-white\);/);
  assert.doesNotMatch(css, /\.product-page \.sku-cta \.button:first-child/);
  assert.match(css, /\.variant-option\[aria-pressed="true"\] \{[\s\S]*?background: #eaf1f3;/);
});
