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
const cardSource = await readFile(new URL("../components/ReadyKitGroupCard.tsx", import.meta.url), "utf8");
const path = slug => `/komplekty/${slug}`;
const rub = value => value === null ? "Цена уточняется" : `${value} ₽`;
const styles = new Proxy({}, { get: (_, key) => String(key) });
const Card = new Function("React", "Link", "useState", "kitPath", "kitRub", "cardStyles", "styles", `${compile(cardSource)};return ReadyKitGroupCard;`)(
  React, ({ children, ...props }) => React.createElement("a", props, children), useState, path, rub, styles, styles,
);
const kits = [ ["roof", 4], ["roof", 6], ["wall", 3], ["wall", 6] ].flatMap(([route, height_m]) =>
  [115, 120, 150].map(diameter_mm => ({ route, height_m, diameter_mm,
    slug: `${route}-${height_m}-${diameter_mm}`, name: `Комплект ${route} ${height_m} Ø${diameter_mm}`,
    image_path: `/media/${route}.webp`, total_rub: `${height_m * diameter_mm}.45`,
    lines: Array.from({ length: diameter_mm === 150 ? 3 : 2 }, (_, index) => ({ sku_id: `${index}`, quantity: 1 })),
  })));
const render = group => renderToStaticMarkup(React.createElement(Card, { group }));

test("12 published variants form four ordered groups without changing any source data", () => {
  const shuffled = [...kits].reverse(), before = structuredClone(shuffled);
  const groups = groupReadyKits(shuffled);
  assert.deepEqual(groups.map(group => group.key), ["roof-4", "roof-6", "wall-3", "wall-6"]);
  assert.deepEqual(groups.map(group => group.name), ["Через перекрытие — 4 м", "Через перекрытие — 6 м", "Через стену — 3 м", "Через стену — 6 м"]);
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
