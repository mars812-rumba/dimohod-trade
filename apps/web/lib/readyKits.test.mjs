import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./readyKits.ts", import.meta.url), "utf8");
const executable = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace(/\bexport\s+/g, "");
const { kitMetadata, kitPath, kitRub } = new Function(`${executable}; return {kitMetadata,kitPath,kitRub};`)();

test("all twelve variants have distinct human-readable canonical, title and description", () => {
  const titles = new Set(), descriptions = new Set(), canonicals = new Set();
  for (const [route, heights] of [["roof", [4, 6]], ["wall", [3, 6]]]) {
    for (const height of heights) for (const diameter of [115, 120, 150]) {
      const direction = route === "roof" ? "perekrytie" : "stenu";
      const routeText = route === "roof" ? "через перекрытие" : "через стену";
      const kit = { slug: `cherez-${direction}-${height}m-d${diameter}`, route, height_m: height, diameter_mm: diameter,
        name: `Комплект дымохода ${routeText}, ${height} м, Ø${diameter} мм` };
      const meta = kitMetadata(kit);
      assert.ok(meta.title.includes(`${diameter} мм`));
      assert.equal(meta.alternates.canonical, kitPath(kit.slug));
      assert.ok(!meta.alternates.canonical.includes("?"));
      titles.add(meta.title); descriptions.add(meta.description); canonicals.add(meta.alternates.canonical);
    }
  }
  assert.equal(titles.size, 12); assert.equal(descriptions.size, 12); assert.equal(canonicals.size, 12);
});

test("missing price is not formatted as free and kopecks are retained", () => {
  assert.equal(kitRub(null), "Цена уточняется");
  assert.match(kitRub("1234.56"), /1\D234,56/);
});

test("BOM and metadata are server-rendered and selectors do not invent unavailable variants", async () => {
  const page = await readFile(new URL("../app/komplekty/[slug]/page.tsx", import.meta.url), "utf8");
  assert.ok(!page.includes('"use client"'));
  assert.match(page, /kit\.lines\.map/);
  assert.match(page, /application\/ld\+json/);
  const selectors = await readFile(new URL("../components/ReadyKitControls.tsx", import.meta.url), "utf8");
  assert.match(selectors, /variants\.filter/);
  assert.ok(!selectors.includes("[115, 120, 150]"));
  const sitemap = await readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8");
  assert.match(sitemap, /getReadyKits\(\)/);
  assert.match(sitemap, /kitPath\(kit\.slug\)/);
});
