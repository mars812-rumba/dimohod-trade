import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function load(file, name, imports = {}) {
  const source = await readFile(new URL(file, import.meta.url), "utf8");
  const executable = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
    .replace(/^import .*;\n/gmu, "").replace(/\bexport\s+/gu, "");
  return new Function(...Object.keys(imports), `${executable}\nreturn ${name};`)(...Object.values(imports));
}
const terms = await load("./deliveryNoteTerms.ts", "deliveryNoteTerms");
const definition = await load("./chimneyDeliveryNotePdf.ts", "deliveryNoteDocument", {
  deliveryNoteTerms: terms,
  estimateDiscount: await load("./estimateDiscount.ts", "estimateDiscount"),
  operator: await load("./privacy.ts", "operator"),
});
const issuedAt = new Date("2026-11-17T22:30:00Z");
const estimate = {
  customer: { name: "Local customer", contactMethod: "telegram", contact: "@local_customer" },
  knownSubtotalRub: 9601, unpricedLineCount: 0, totalUnits: 2,
  reviewItems: ["private warning"], removedLabels: ["removed item"],
  lines: [{ label: "Flange", skuName: "Selected flange", characteristics: ["600×750 мм", "Под углом"],
    quantity: 2, unitPriceRub: 4800.5, lineTotalRub: 9601, note: "private note", image: { url: "private-image" } }],
};
const table = doc => doc.content.find(item => item.table?.headerRows === 1).table;
const text = doc => JSON.stringify(doc).replace(/[\u00a0\u202f]/gu, " ");

test("delivery note uses the quotation number, current issue date and saved customer/line prices without images", () => {
  const original = structuredClone(estimate);
  const doc = definition(estimate, "  2026-07/81  ", issuedAt);
  const json = text(doc);
  for (const expected of ["Товарная накладная №2026-07/81", "Коммерческое предложение №2026-07/81", "18 ноября 2026", "Local customer", "Telegram", "@local_customer", "Selected flange", "600×750 мм", "Под углом", "+7 (812) 642-45-65", "Без налога (НДС)", "С условиями согласен", "Подпись", "Дата", "9 601,00", "4 800,50"]) assert.ok(json.includes(expected), expected);
  for (const excluded of ["private-image", "private note", "private warning", "removed item", '"image":']) assert.ok(!json.includes(excluded), excluded);
  assert.equal(doc.pageSize, "A4");
  assert.equal(table(doc).body[0].length, 6);
  assert.equal(table(doc).body[1][2].text, "2");
  assert.deepEqual(estimate, original);
});

test("every owner-supplied rules paragraph is included and final signature/date stay together", () => {
  const doc = definition(estimate, "RULES", issuedAt);
  const json = JSON.stringify(doc);
  for (const section of terms) {
    assert.ok(json.includes(section.title));
    for (const paragraph of section.paragraphs) assert.ok(json.includes(paragraph), paragraph);
  }
  assert.equal(terms[1].paragraphs.filter(p => /^6\.[1-9]\./u.test(p)).length, 9);
  const last = doc.content.at(-1);
  assert.equal(last.unbreakable, true);
  assert.equal(last.stack[0].text, "С условиями согласен");
  assert.ok(JSON.stringify(last).includes("Дата"));
  assert.ok(!json.includes("товар получен в полном")); // Do not complete the truncated source sentence.
});

test("delivery note retains money precision, discounts and explicit unknown prices", () => {
  const doc = definition({ ...estimate, discountEnabled: true, discountPercent: 10 }, "DISCOUNT", issuedAt);
  for (const expected of ["9 601,00", "960,10", "8 640,90", "Скидка 10%"]) assert.ok(text(doc).includes(expected), expected);
  assert.equal(table(doc).body[1][4].text.replace(/\s/gu, ""), "4800,50");
  const unpriced = definition({ ...estimate, unpricedLineCount: 1, lines: [{ ...estimate.lines[0], unitPriceRub: null, lineTotalRub: null }] }, "UNKNOWN", issuedAt);
  assert.equal(table(unpriced).body[1][4].text, "По запросу");
  assert.equal(table(unpriced).body[1][5].text, "—");
  assert.ok(text(unpriced).includes("1 поз. без цены не включены в итог"));
  const free = definition({ ...estimate, discountEnabled: true, discountPercent: 100 }, "FREE", issuedAt);
  assert.ok(text(free).includes("Всего к оплате: 0,00 руб."));
});

test("long notes repeat table headers and preserve all rows; missing fields are not invented", () => {
  const lines = Array.from({ length: 150 }, (_, i) => ({ ...estimate.lines[0], skuName: `Item ${i + 1}` }));
  const doc = definition({ ...estimate, lines }, "LONG", issuedAt);
  assert.equal(table(doc).headerRows, 1);
  assert.equal(table(doc).body.length, 151);
  assert.equal(table(doc).body[150][0].text, "150");
  const manual = definition({ ...estimate, customer: undefined, lines: [{ ...estimate.lines[0], label: "Manual", skuName: null, characteristics: [] }] }, "MANUAL", issuedAt);
  assert.ok(text(manual).includes("Manual"));
  assert.ok(text(manual).includes("__________________"));
  assert.ok(!text(manual).includes("undefined"));
  assert.throws(() => definition(estimate, "  ", issuedAt), /Укажите номер КП/u);
});
