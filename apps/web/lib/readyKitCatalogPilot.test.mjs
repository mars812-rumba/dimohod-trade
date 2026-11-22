import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./readyKitCatalogPilot.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText.replace(/\bexport\s+/g, "");
const load = value => new Function("process", `${code};return readyKitCatalogPilot;`)({ env: { READY_KITS_CATALOG_PREVIEW: value } });

test("normal release enables all approved groups without any environment flag", () => {
  for (const value of [undefined, "", "0", "1", "true"]) {
    for (const [route, height] of [["roof", 4], ["roof", 6], ["wall", 3], ["wall", 6]]) assert.equal(load(value)(route, height), true);
  }
});
test("catalog presentation does not opt unknown groups in", () => {
  const enabled = load(undefined);
  for (const [route, height] of [["roof", 3], ["wall", 4], ["roof", 8], ["other", 4]]) assert.equal(enabled(route, height), false);
});
test("pilot leaves metadata and BOM/PDF/actions on their existing paths", async () => {
  const detail = await readFile(new URL("../app/komplekty/[slug]/page.tsx", import.meta.url), "utf8");
  const list = await readFile(new URL("../app/komplekty/page.tsx", import.meta.url), "utf8");
  assert.match(detail, /readyKitCatalogPilot\(kit\.route, kit\.height_m\)/);
  assert.match(list, /catalogPreview=\{readyKitCatalogPilot\(group\.route, group\.height_m\)\}/);
  for (const unchanged of ["kitMetadata(data.kit)", "<ReadyKitSelectors kit={kit} variants={variants}", "<ReadyKitInquiry name={kit.name} slug={kit.slug}", "kit.lines.map(", "<ReadyKitPdf kit={kit}", "<ReadyKitRecommendations kit={kit}"]) assert.ok(detail.includes(unchanged));
});
