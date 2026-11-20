import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { join } from "node:path";

const source = await readFile(new URL("./readyKitPresentation.ts", import.meta.url), "utf8");
const executable = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText.replace(/\bexport\s+/g, "");
const { kitApplicationSections, kitChecklistIcon } = new Function(`${executable}; return {kitApplicationSections,kitChecklistIcon};`)();
const content = JSON.parse(await readFile(new URL("../../../backend/app/modules/ready_kits/content.json", import.meta.url), "utf8"));

for (const [scheme, data] of Object.entries(content)) {
  test(`${scheme}: readable sections retain every word, number and sentence in original order`, () => {
    const [route, height] = scheme.split("-");
    const sections = kitApplicationSections(data.application_description, route, Number(height));
    assert.ok(sections.length >= 3);
    assert.equal(sections.flatMap(section => section.paragraphs).join(" "), data.application_description);
    assert.ok(sections.some(section => section.title === "Что означает высота"));
    assert.ok(sections.some(section => section.title === "Данные для подбора"));
  });
  test(`${scheme}: shared scheme asset exists for all three diameters`, async () => {
    await access(new URL(`../public/images/ready-kits/${scheme}m-scheme.webp`, import.meta.url));
  });
}

test("custom admin text keeps paragraphs and does not split decimal values", () => {
  const text = "Сталь толщиной 0.8 мм. Участок 750 мм.\n\nКомментарий менеджера.";
  const sections = kitApplicationSections(text, "roof", 4);
  assert.equal(sections.flatMap(section => section.paragraphs).join(" "), text.replace(/\n\n/g, " "));
  assert.equal(kitChecklistIcon("Измерьте расстояние и высоту"), "ruler");
  assert.equal(kitChecklistIcon("Пришлите фотографию"), "camera");
  assert.equal(kitChecklistIcon("Сообщите модель печи"), "clipboard");
});

test("tabs enhance pre-rendered panels without hashes, fetching or conditional unmounting", async () => {
  const tabs = await readFile(new URL("../components/ReadyKitTabs.tsx", import.meta.url), "utf8");
  assert.match(tabs, /hidden=\{enhanced && active !== id\}/);
  assert.match(tabs, /\{panels\[id\]\}/);
  assert.match(tabs, /role="tablist"/);
  assert.match(tabs, /aria-controls=/);
  assert.match(tabs, /preventScroll: true/);
  for (const disallowed of ["fetch(", "router.", "location.hash", "scrollIntoView", "minHeight"]) assert.ok(!tabs.includes(disallowed));
});

test("scheme selection hides missing assets and never guesses an unknown route or height", async () => {
  const source = await readFile(new URL("./readyKitScheme.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } })
    .outputText.replace(/^import .*;\n/gm, "").replace(/\bexport\s+/g, "");
  const load = exists => new Function("existsSync", "join", "process", `${code}; return readyKitScheme;`)(exists, join, { cwd: () => "/workspace" });
  assert.equal(load(() => false)("roof", 4), null);
  assert.equal(load(() => true)("unknown", 4), null);
  assert.equal(load(() => true)("roof", 3), null);
  for (const scheme of Object.keys(content)) {
    const [route, height] = scheme.split("-");
    assert.equal(load(() => true)(route, Number(height)), `/images/ready-kits/${scheme}m-scheme.webp`);
  }
});
