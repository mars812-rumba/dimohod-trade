import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(webRoot, relativePath), "utf8");

const home = read("app/page.tsx");
const product = read("app/product/[slug]/page.tsx");
const scenario = read("components/ScenarioPageTemplate.tsx");
const solutions = read("app/solutions/page.tsx");
const guidePage = read("app/guides/[slug]/page.tsx");
const guideArticles = read("lib/guideArticles.ts");

test("homepage identifies the organization, website and current webpage", () => {
  assert.match(home, /"@type": "Organization"/);
  assert.match(home, /"@type": "WebSite"/);
  assert.match(home, /"@type": "WebPage"/);
  assert.ok(home.includes('isPartOf: { "@id": "https://dimohod-trade.pro/#website" }'));
});

test("scenario detail and hub pages expose their visible hierarchy", () => {
  assert.match(scenario, /"@type": "WebPage"/);
  assert.match(scenario, /"@type": "BreadcrumbList"/);
  assert.match(scenario, /content\.metadata\.title/);
  assert.match(solutions, /"@type": "CollectionPage"/);
  assert.match(solutions, /"@type": "BreadcrumbList"/);
  assert.match(solutions, /"@type": "ItemList"/);
});

test("multipage products keep one stable group and link other canonical diameter pages", () => {
  assert.ok(product.includes("const productGroupId ="));
  assert.ok(product.includes("otherVariantUrls"));
  assert.ok(product.includes('isVariantOf: { "@id": productGroupId }'));
  assert.ok(product.includes("hasVariant: variant ? [variant, ...otherVariantUrls]"));
  const productGroup = product.slice(
    product.indexOf('"@type": "ProductGroup"'),
    product.indexOf('"@type": "WebPage"'),
  );
  assert.doesNotMatch(productGroup, /url: canonicalUrl/);
});

test("articles carry stored publication and modification dates", () => {
  assert.match(guideArticles, /publishedAt: string/);
  assert.match(guideArticles, /modifiedAt: string/);
  assert.match(guidePage, /datePublished: article\.publishedAt/);
  assert.match(guidePage, /dateModified: article\.modifiedAt/);
  assert.match(guidePage, /"@type": "WebPage"/);
});

test("structured data does not invent ratings, reviews or how-to markup", () => {
  for (const source of [home, product, scenario, solutions, guidePage]) {
    assert.doesNotMatch(source, /AggregateRating|"@type": "Review"|"@type": "HowTo"/);
    assert.doesNotMatch(source, /NEXT_PUBLIC_APP_URL \?\? "http:\/\/localhost:3000"/);
  }
});
