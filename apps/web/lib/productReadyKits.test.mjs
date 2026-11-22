import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Package } from "lucide-react";
import ts from "typescript";

const compile = source => ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React,
} }).outputText.replace(/^import .*;\n/gmu, "").replace(/\bexport\s+/gu, "");
const recommendation = await readFile(new URL("./readyKitRecommendations.ts", import.meta.url), "utf8");
const recommendationName = new Function(`${compile(recommendation)};return recommendationName;`)();
const source = await readFile(new URL("./productReadyKits.ts", import.meta.url), "utf8");
const { productReadyKitMemberships, productReadyKitLinks } = new Function("kitPath", "recommendationName", `${compile(source)};return {productReadyKitMemberships,productReadyKitLinks};`)(slug => `/komplekty/${slug}`, recommendationName);
const kits = [115, 120, 150, 200].flatMap(diameter_mm => [3, 6].map(height_m => ({
  slug: `actual-wall-${height_m}-d${diameter_mm}`, route: "wall", height_m, diameter_mm,
  lines: [{ sku_id: "shared-component-without-diameter" }, { sku_id: `exact-${diameter_mm}` }, { sku_id: `exact-${diameter_mm}` }],
})));

test("one component can occur in every published diameter, including future diameters", () => {
  const memberships = productReadyKitMemberships(kits);
  const links = productReadyKitLinks(memberships, "shared-component-without-diameter");
  assert.equal(links.length, kits.length);
  assert.deepEqual(links.map(item => item.href), kits.map(k => `/komplekty/${k.slug}`));
  assert.ok(links.some(item => item.label === "Через стену · 3 м вверх · Ø150 мм →"));
});
test("expanding the published lineup beyond twelve needs no membership code changes", () => {
  const expanded = [...kits, ...[8, 9, 10, 11, 12, 13, 14].map(height_m => ({
    slug: `new-roof-${height_m}-d180`, route: "roof", height_m, diameter_mm: 180,
    lines: [{ sku_id: "shared-component-without-diameter" }],
  }))];
  const links = productReadyKitLinks(productReadyKitMemberships(expanded), "shared-component-without-diameter");
  assert.ok(expanded.length > 12);
  assert.equal(links.length, expanded.length);
  assert.equal(links.at(-1).label, "Через перекрытие · 14 м · Ø180 мм →");
  assert.equal(links.at(-1).href, "/komplekty/new-roof-14-d180");
});
test("exact IDs only, with no diameter, article or family fallback; variant changes update/hide the list", () => {
  const memberships = productReadyKitMemberships(kits);
  assert.equal(productReadyKitLinks(memberships, "exact-115").length, 2);
  assert.equal(productReadyKitLinks(memberships, "exact-120").length, 2);
  for (const missing of [null, undefined, "", "115", "same-family-same-diameter-different-id", "article-115"]) assert.deepEqual(productReadyKitLinks(memberships, missing), []);
  assert.ok(productReadyKitLinks(memberships, "exact-120").every(item => item.label.includes("Ø120 мм")));
});
test("repeated specification rows and duplicated variants never duplicate a link; payload contains no full BOM", () => {
  const memberships = productReadyKitMemberships([...kits, kits[0]]);
  assert.equal(productReadyKitLinks(memberships, "exact-115").length, 2);
  assert.ok(memberships.every(item => item.skuIds.length === 2));
  assert.deepEqual(Object.keys(memberships[0]).sort(), ["href", "label", "skuIds"]);
  assert.deepEqual(productReadyKitMemberships([]), []);
});
test("section renders ordinary SSR links and Lucide Package, and disappears completely when empty", async () => {
  const component = await readFile(new URL("../components/ProductReadyKits.tsx", import.meta.url), "utf8");
  const styles = new Proxy({}, { get: (_, key) => String(key) });
  const Component = new Function("React", "Link", "Package", "styles", `${compile(component)};return ProductReadyKits;`)(React, ({ children, prefetch, ...props }) => React.createElement("a", props, children), Package, styles);
  const links = productReadyKitLinks(productReadyKitMemberships(kits), "exact-115");
  const html = renderToStaticMarkup(React.createElement(Component, { links }));
  assert.ok(html.includes("Входит в готовые комплекты"));
  assert.ok(html.includes("lucide-package"));
  for (const { href, label } of links) { assert.ok(html.includes(`href="${href}"`)); assert.ok(html.includes(label)); }
  assert.equal(renderToStaticMarkup(React.createElement(Component, { links: [] })), "");
});
