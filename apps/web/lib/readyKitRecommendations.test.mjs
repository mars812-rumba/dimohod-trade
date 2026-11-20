import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const compile = source => ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React,
} }).outputText.replace(/^import .*;\n/gmu, "").replace(/\bexport\s+/gu, "");
const source = await readFile(new URL("./readyKitRecommendations.ts", import.meta.url), "utf8");
const { readyKitRecommendations, recommendationName } = new Function(`${compile(source)};return {readyKitRecommendations,recommendationName};`)();
const component = await readFile(new URL("../components/ReadyKitRecommendations.tsx", import.meta.url), "utf8");
const Card = new Function("React", "Link", "kitPath", "kitRub", "readyKitRecommendations", "recommendationName", "styles",
  `${compile(component)};return ReadyKitRecommendations;`)(React,
  ({ children, ...props }) => React.createElement("a", props, children), slug => `/komplekty/${slug}`,
  price => price === null ? "Цена уточняется" : `${price} ₽`, readyKitRecommendations, recommendationName,
  new Proxy({}, { get: (_, key) => String(key) }));
const kits = [["roof", 4], ["roof", 6], ["wall", 3], ["wall", 6]].flatMap(([route, height_m]) =>
  [115, 120, 150].map(diameter_mm => ({ slug: `${route}-${height_m}-${diameter_mm}`, route, height_m, diameter_mm,
    total_rub: "12345.67", image_path: `/images/${route}.webp` })));
const expected = { "roof-4": ["roof-6", "wall-3", "wall-6"], "roof-6": ["roof-4", "wall-6", "wall-3"],
  "wall-3": ["wall-6", "roof-4", "roof-6"], "wall-6": ["wall-3", "roof-6", "roof-4"] };

for (const kit of kits) test(`${kit.slug}: exactly three other schemes, same diameter, ordered and server-rendered`, () => {
  const variants = [...kits].reverse(), before = structuredClone(variants);
  const result = readyKitRecommendations(kit, variants);
  assert.deepEqual(result.map(item => `${item.route}-${item.height_m}`), expected[`${kit.route}-${kit.height_m}`]);
  assert.ok(result.every(item => item.diameter_mm === kit.diameter_mm && item.slug !== kit.slug));
  assert.equal(new Set(result.map(item => item.slug)).size, 3);
  assert.deepEqual(variants, before);
  const html = renderToStaticMarkup(React.createElement(Card, { kit, variants }));
  assert.ok(html.includes(`Другие комплекты Ø${kit.diameter_mm} мм`));
  assert.equal((html.match(/data-kit-recommendation="true"/gu) ?? []).length, 3);
  for (const item of result) {
    assert.ok(html.includes(`href="/komplekty/${item.slug}"`));
    assert.ok(html.includes(recommendationName(item)));
    assert.ok(html.includes(`src="${item.image_path}"`));
  }
  assert.ok(!html.includes(`href="/komplekty/${kit.slug}"`));
  assert.equal((html.match(/12345.67 ₽/gu) ?? []).length, 3);
});

test("missing variants are not invented, duplicate schemes/current scheme are excluded, unknown price stays unknown", () => {
  const kit = kits[0], alternate = { ...kit, slug: "same-scheme-alias" };
  const other = kits.find(item => item.route === "wall" && item.height_m === 3 && item.diameter_mm === 115);
  const variants = [kit, alternate, { ...other, total_rub: null }, { ...other, slug: "duplicate" }, kits[1]];
  assert.equal(readyKitRecommendations(kit, variants).length, 1);
  assert.equal(readyKitRecommendations(kit, [kit, alternate, kits[1]]).length, 0);
  assert.equal(renderToStaticMarkup(React.createElement(Card, { kit, variants: [] })), "");
  assert.ok(renderToStaticMarkup(React.createElement(Card, { kit, variants: [{ ...other, total_rub: null }] })).includes("Цена уточняется"));
});

test("recommendations occur once after tabs and FAQ; only three tab panels remain; scenarios stay in application", async () => {
  const page = await readFile(new URL("../app/komplekty/[slug]/page.tsx", import.meta.url), "utf8");
  const tabs = await readFile(new URL("../components/ReadyKitTabs.tsx", import.meta.url), "utf8");
  assert.equal((page.match(/<ReadyKitRecommendations /gu) ?? []).length, 1);
  assert.ok(page.indexOf("<ReadyKitRecommendations ") > page.indexOf('id="faq"'));
  assert.doesNotMatch(page, /related: <section/);
  assert.doesNotMatch(tabs, /id: "related"/);
  assert.equal((tabs.match(/label: "/gu) ?? []).length, 3);
  const application = page.slice(page.indexOf("application: <section"), page.indexOf("conditions: <section"));
  for (const scenario of ["banya", "dom", "pech"]) assert.ok(application.includes(`/solutions/${scenario}`));
  assert.ok(!component.includes('"use client"'));
});
