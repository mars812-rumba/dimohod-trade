import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./chimneySpecificationPdf.ts", import.meta.url), "utf8");
const executable = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
  .replace(/^import .*;\n/gmu, "").replace(/\bexport\s+/gu, "");
const definition = new Function(`${executable}\nreturn specificationDocument;`)();
const estimate = { customer: { name: "Local customer", contact: "+70000000000" },
  knownSubtotalRub: 987654, reviewItems: ["private warning"], removedLabels: ["removed item"],
  lines: [{ label: "Flange", skuName: "Selected flange", characteristics: ["600×750 мм", "Под углом"],
    quantity: 2, unitPriceRub: 123456, lineTotalRub: 246912, note: "private note", image: { url: "private-image" } }] };

test("specification has only the approved customer, item and quantity fields", () => {
  const doc = definition(estimate, "2026-07/81");
  const json = JSON.stringify(doc);
  for (const expected of ["2026-07/81", "Local customer", "+70000000000", "Selected flange", "600×750 мм", "Под углом", "шт", "Начало изготовления", "Конец изготовления", "Готовность", "Со спецификацией согласен"]) assert.ok(json.includes(expected), expected);
  for (const excluded of ["987654", "123456", "246912", "private note", "private warning", "removed item", "private-image", "Цена", "Сумма", "₽"]) assert.ok(!json.includes(excluded), excluded);
  assert.equal(doc.pageSize, "A4");
  const table = doc.content.find(item => item.table?.headerRows === 1).table;
  assert.equal(table.body[0].length, 4);
  assert.equal(table.body[1][2].text, "2");
});

test("long specifications retain all positions with repeating table headers", () => {
  const lines = Array.from({ length: 150 }, (_, i) => ({ ...estimate.lines[0], skuName: `Item ${i + 1}` }));
  const doc = definition({ ...estimate, lines }, "Long КП");
  const table = doc.content.find(item => item.table?.headerRows === 1).table;
  assert.equal(table.body.length, 151);
  assert.equal(table.body[150][0].text, "150");
  assert.ok(JSON.stringify(doc).includes("Item 150"));
});

test("missing customer and manual positions do not invent details", () => {
  const doc = definition({ lines: [{ label: "Manual", skuName: null, characteristics: [], quantity: 1 }] }, "Manual КП");
  const json = JSON.stringify(doc);
  assert.ok(json.includes("Manual"));
  assert.ok(json.includes("__________________"));
  assert.ok(!json.includes("undefined"));
});
