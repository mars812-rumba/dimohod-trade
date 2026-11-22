import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import React, { useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const compile = source => ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React,
} }).outputText.replace(/^import .*;\n/gmu, "").replace(/\bexport\s+/gu, "");
const groupSource = await readFile(new URL("./readyKitGroups.ts", import.meta.url), "utf8");
const groupReadyKits = new Function(`${compile(groupSource)};return groupReadyKits;`)();
const pilotSource = await readFile(new URL("./readyKitCatalogPilot.ts", import.meta.url), "utf8");
const readyKitCatalogPilot = new Function(`${compile(pilotSource)};return readyKitCatalogPilot;`)();
const cardSource = await readFile(new URL("../components/ReadyKitGroupCard.tsx", import.meta.url), "utf8");
const path = slug => `/komplekty/${slug}`;
const rub = value => value === null ? "Цена уточняется" : `${value} ₽`;
const styles = new Proxy({}, { get: (_, key) => String(key) });
const Icon = props => React.createElement("svg", props);
const Card = new Function("React", "Link", "useState", "kitPath", "kitRub", "cardStyles", "styles", "Circle", "Layers3", `${compile(cardSource)};return ReadyKitGroupCard;`)(
  React, ({ children, ...props }) => React.createElement("a", props, children), useState, path, rub, styles, styles, Icon, Icon,
);
const kits = [ ["roof", 4], ["roof", 6], ["wall", 3], ["wall", 6] ].flatMap(([route, height_m]) =>
  [115, 120, 150].map(diameter_mm => ({ route, height_m, diameter_mm,
    slug: `${route}-${height_m}-${diameter_mm}`, name: `Комплект ${route} ${height_m} Ø${diameter_mm}`,
    image_path: `/media/${route}.webp`, total_rub: `${height_m * diameter_mm}.45`,
    lines: Array.from({ length: diameter_mm === 150 ? 3 : 2 }, (_, index) => ({ sku_id: `${index}`, quantity: 1 })),
  })));
const render = group => renderToStaticMarkup(React.createElement(Card, { group }));

test("normal release shows the new view on exactly one group and keeps all twelve variant links", () => {
  const html = groupReadyKits(kits).map(group => renderToStaticMarkup(React.createElement(Card, {
    group, catalogPreview: readyKitCatalogPilot(group.route, group.height_m),
  }))).join("");
  assert.equal((html.match(/data-catalog-pilot="true"/g) || []).length, 1);
  assert.match(html, /data-kit-group="roof-4" data-catalog-pilot="true"/);
  for (const kit of kits) assert.ok(html.includes(`href="${path(kit.slug)}"`));
});

test("opt-in catalog card preserves variant links, text, image and price, adding only presentation", () => {
  const [group] = groupReadyKits(kits);
  const original = render(group), pilot = renderToStaticMarkup(React.createElement(Card, { group, catalogPreview: true }));
  assert.ok(!original.includes('data-catalog-pilot="true"'));
  assert.ok(pilot.includes('data-catalog-pilot="true"'));
  assert.equal((pilot.match(/<svg/g) || []).length, 2);
  assert.deepEqual([...pilot.matchAll(/href="([^"]+)"/g)].map(match => match[1]), [...original.matchAll(/href="([^"]+)"/g)].map(match => match[1]));
  for (const text of [group.name, rub(group.variants[0].total_rub), "за комплект Ø115", group.variants[0].description]) assert.ok(pilot.includes(text));
});

test("12 published variants form four ordered groups without changing any source data", () => {
  const shuffled = [...kits].reverse(), before = structuredClone(shuffled);
  const groups = groupReadyKits(shuffled);
  assert.deepEqual(groups.map(group => group.key), ["roof-4", "roof-6", "wall-3", "wall-6"]);
  assert.deepEqual(groups.map(group => group.name), ["Через перекрытие и кровлю · 4 м", "Через перекрытие и кровлю · 6 м", "Через стену · 3 м вверх", "Через стену · 6 м вверх"]);
  for (const group of groups) {
    assert.deepEqual(group.variants.map(variant => variant.diameter_mm), [115, 120, 150]);
    for (const variant of group.variants) {
      const original = kits.find(kit => kit.slug === variant.slug);
      assert.equal(variant.total_rub, original.total_rub);
      assert.equal(variant.line_count, original.lines.length);
      assert.equal(variant.image_path, original.image_path);
      assert.ok(!("lines" in variant), "BOM is not duplicated in interactive card props");
    }
  }
  assert.deepEqual(shuffled, before);
});

test("server HTML contains all 12 ordinary diameter links and selects 115 by default", () => {
  const groups = groupReadyKits(kits);
  for (const group of groups) {
    const html = render(group);
    const nav = html.match(/<nav[^>]*>(.*?)<\/nav>/u)[1];
    for (const variant of group.variants) assert.ok(nav.includes(`href="${path(variant.slug)}"`));
    assert.equal((nav.match(/aria-current="true"/gu) ?? []).length, 1);
    assert.match(nav, /href="[^"]*115"[^>]*aria-current="true"/u);
    assert.match(html, /data-kit-open="true" href="[^"]*115"/u);
    assert.ok(html.includes(rub(group.variants[0].total_rub)));
    assert.ok(html.includes("за комплект Ø115"));
    assert.ok(html.includes("Схема и состав →"));
    assert.ok(!html.includes("позиций в составе"));
    assert.ok(!nav.includes("nofollow"));
  }
});

test("missing or unpublished variants are not invented; empty groups stay absent", () => {
  assert.deepEqual(groupReadyKits([]), []);
  const groups = groupReadyKits(kits.filter(kit => kit.diameter_mm === 150 && kit.route === "wall"));
  assert.equal(groups.length, 2);
  for (const group of groups) {
    const html = render(group);
    assert.match(html, /Ø150<\/a>/u);
    assert.ok(!html.includes("Ø115"));
    assert.ok(!html.includes("Ø120"));
    assert.match(html, /data-kit-open="true" href="[^"]*150"/u);
  }
});

test("unknown price stays unknown in the grouped card", () => {
  const [group] = groupReadyKits([{ ...kits[0], total_rub: null }]);
  assert.equal(group.variants[0].total_rub, null);
  assert.ok(render(group).includes("Цена уточняется"));
});

const steelGroup = (kind, value) => ({ kind, fields: [{ key: "steel", value }] });
const pipe = (length_mm, quantity, inner = "AISI 304", outer = "AISI 430") => ({ length_mm, quantity,
  characteristic_groups: [steelGroup("inner", inner), steelGroup("outer", outer)] });

test("all four approved summaries follow verified pipe/passages/console counts in each diameter", () => {
  for (const route of ["roof", "wall"]) for (const height_m of route === "roof" ? [4, 6] : [3, 6]) for (const diameter_mm of [115, 120, 150]) {
    const kit = { ...kits[0], route, height_m, diameter_mm, lines: [pipe(1000, route === "roof" && height_m === 4 ? 3 : height_m),
      ...(route === "roof" ? [
        { length_mm: 1000, quantity: 1, characteristic_groups: [] },
        { article: "DT-PASSAGE-GLASS-GALV-D100-200", quantity: height_m === 4 ? 1 : 2 },
      ] : [pipe(750, 1), { label: "Консоль универсальная фасадная", quantity: height_m === 6 ? 2 : 1 }]),
    ] };
    const [group] = groupReadyKits([kit]);
    const variant = group.variants[0];
    assert.deepEqual(variant.sandwich_steel, { inner: "AISI 304", outer: "AISI 430" });
    assert.ok(variant.description.includes(route === "roof" ? "одностенная" : "750 мм"));
    if (route === "wall" && height_m === 6) assert.ok(variant.description.includes("двумя фасадными консолями"));
    const html = render(group);
    assert.ok(html.includes(`за комплект Ø${diameter_mm}`));
    assert.ok(html.includes("внутри AISI 304, снаружи AISI 430."));
  }
});

test("summary never keeps stale counts; steel comes from every selected sandwich pipe", () => {
  const kit = { ...kits[0], route: "wall", height_m: 6,
    lines: [pipe(1000, 6, "AISI 316"), pipe(750, 1, "AISI 316"), { label: "Консоль универсальная фасадная", quantity: 2 }] };
  assert.equal(groupReadyKits([kit])[0].variants[0].sandwich_steel.inner, "AISI 316");
  kit.lines[0].quantity = 7;
  assert.equal(groupReadyKits([kit])[0].variants[0].description, "Полный состав выбранного диаметра — в спецификации комплекта.");
  kit.lines[1].characteristic_groups = [steelGroup("inner", "AISI 316")];
  assert.equal(groupReadyKits([kit])[0].variants[0].sandwich_steel, null);
});
