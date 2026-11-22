import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./readyKitCatalogPilot.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText.replace(/\bexport\s+/g, "");
const load = value => new Function("process", `${code};return readyKitCatalogPilot;`)({ env: { READY_KITS_CATALOG_PREVIEW: value } });

test("catalog trial is off by default and cannot affect production without an explicit local flag", () => {
  for (const value of [undefined, "", "0", "true"]) {
    for (const route of ["roof", "wall"]) for (const height of [3, 4, 6]) assert.equal(load(value)(route, height), false);
  }
});
test("explicit trial styles only the roof 4m family, shared by its three diameters", () => {
  const enabled = load("1");
  assert.equal(enabled("roof", 4), true);
  for (const [route, height] of [["roof", 6], ["wall", 3], ["wall", 6]]) assert.equal(enabled(route, height), false);
});
test("pilot leaves metadata and BOM/PDF/actions on their existing paths", async () => {
  const detail = await readFile(new URL("../app/komplekty/[slug]/page.tsx", import.meta.url), "utf8");
  const list = await readFile(new URL("../app/komplekty/page.tsx", import.meta.url), "utf8");
  assert.match(detail, /readyKitCatalogPilot\(kit\.route, kit\.height_m\)/);
  assert.match(list, /catalogPreview=\{readyKitCatalogPilot\(group\.route, group\.height_m\)\}/);
  for (const unchanged of ["kitMetadata(data.kit)", "<ReadyKitSelectors kit={kit} variants={variants}", "<ReadyKitInquiry name={kit.name} slug={kit.slug}", "kit.lines.map(", "<ReadyKitPdf kit={kit}", "<ReadyKitRecommendations kit={kit}"]) assert.ok(detail.includes(unchanged));
});
