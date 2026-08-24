import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, "..");
const catalog = JSON.parse(readFileSync(resolve(here, "stoves.generated.json"), "utf8"));
const stovesSource = readFileSync(resolve(here, "stoves.ts"), "utf8");
const componentSource = readFileSync(
  resolve(webRoot, "components", "StoveCatalogPage.tsx"),
  "utf8",
);
const stylesSource = readFileSync(resolve(webRoot, "app", "pechi", "page.module.css"), "utf8");
const headerSource = readFileSync(resolve(webRoot, "components", "SiteHeader.tsx"), "utf8");
const sitemapSource = readFileSync(resolve(webRoot, "app", "sitemap.ts"), "utf8");

test("stove catalog contains every locally downloaded source image", () => {
  assert.equal(catalog.length, 675);
  assert.equal(new Set(catalog.map(({ id }) => id)).size, catalog.length);
  assert.equal(new Set(catalog.map(({ image }) => image)).size, catalog.length);

  for (const stove of catalog) {
    assert.equal(typeof stove.name, "string");
    assert.ok(stove.name.trim().length > 0);
    assert.ok(stove.image.startsWith("/images/stoves/"));
    assert.ok(existsSync(resolve(webRoot, "public", stove.image.slice(1))), stove.image);
  }
});

test("stove catalog is paginated by 21 cards", () => {
  assert.match(stovesSource, /STOVES_PER_PAGE\s*=\s*21/);
  assert.match(componentSource, /stovesForPage\(page\)/);
  assert.match(componentSource, /STOVES_PER_PAGE/);
});

test("stove catalog uses three desktop columns and responsive fallbacks", () => {
  assert.match(stylesSource, /grid-template-columns:\s*repeat\(3,/);
  assert.match(stylesSource, /@media \(max-width: 900px\)[\s\S]*repeat\(2,/);
  assert.match(stylesSource, /@media \(max-width: 620px\)[\s\S]*grid-template-columns:\s*1fr/);
});

test("stove catalog is linked in both main menus and in the sitemap", () => {
  assert.equal(headerSource.match(/href="\/pechi"/g)?.length, 2);
  assert.match(sitemapSource, /stovePageCount/);
  assert.match(sitemapSource, /stovePagePath\(index \+ 1\)/);
});
