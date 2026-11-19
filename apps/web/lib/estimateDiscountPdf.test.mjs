import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./chimneyEstimatePdf.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
  .replace(/^import .*;\n/gmu, "").replace(/\bexport\s+/gu, "")
  .replace('import("pdfmake/build/pdfmake")', 'Promise.resolve({default:pdfMock})')
  .replace('import("pdfmake/build/vfs_fonts")', 'Promise.resolve({default:{}})');
const render = new Function("pdfMock", "loadEstimatePdfImages", "workingHoursText", `${code};loadBrandLogo=async()=>null;return createChimneyEstimatePdf;`)(
  {createPdf:definition=>definition}, async()=>[], "Local test",
);
const estimate = {generatedAt:new Date("2026-10-28"),profileName:"Local test",measurements:[],lines:[],knownSubtotalRub:60251.53,totalUnits:0,unpricedLineCount:0,removedLabels:[],reviewItems:[],calculationErrors:[]};
test("priced PDF shows gross, discount percent, discount amount and net total", async()=>{
  const doc = await render({...estimate,discountEnabled:true,discountPercent:10,discountAmountRub:6025.15,totalAfterDiscountRub:54226.38});
  const text = JSON.stringify(doc).replace(/[\u00a0\u202f]/g," ");
  for(const fragment of ["60 251,53", "Скидка 10%", "6 025,15", "Итого со скидкой", "54 226,38"]) assert.ok(text.includes(fragment),fragment);
});
test("PDF without enabled discount keeps its original totals", async()=>{
  const doc = await render({...estimate,discountEnabled:false,discountPercent:10});
  const text=JSON.stringify(doc);
  assert.ok(!text.includes("Скидка 10%"));
  assert.ok(!text.includes("Итого со скидкой"));
  const measurementTable = doc.content.find(item=>item.table?.widths?.[0]==="42%" && item.table.body[0]?.[0]?.text==="Параметры");
  assert.ok(measurementTable, "empty measurements render a valid non-empty table");
});

test("restored compact PDF keeps flat characteristics, photos, SKU data and amounts", async () => {
  const line = { key: "pipe", label: "Сэндвич-труба", skuName: "Из каталога", article: "REAL", quantity: 2,
    unitPriceRub: 123.45, lineTotalRub: 246.9, matchStatus: "exact", characteristics: ["Legacy flat text"], note: "Не потерять примечание",
    characteristicGroups: [
      { kind: "inner", title: "Внутренняя труба", fields: [{ label: "Сталь", value: "AISI 304" }, { label: "Толщина", value: "0,8 мм" }] },
      { kind: "outer", title: "Наружная оболочка", fields: [{ label: "Сталь", value: "AISI 430" }, { label: "Толщина", value: "0,5 мм" }] },
    ] };
  const doc = await render({ ...estimate, lines: [line], totalUnits: 2, knownSubtotalRub: 246.9 });
  const text = JSON.stringify(doc);
  for (const fragment of ["Сэндвич-труба", "Из каталога", "Арт. REAL", "Legacy flat text", "Не потерять примечание", "123,45", "246,9"]) assert.ok(text.includes(fragment), fragment);
  for (const fragment of ["Внутренняя труба", "Наружная оболочка", "Фото уточняется", "dontBreakRows"]) assert.ok(!text.includes(fragment), fragment);
  const table = doc.content.find(item => item.table?.widths?.length === 5).table;
  assert.deepEqual(table.widths, [18, "*", 30, 62, 70]);
  assert.equal(table.body[1][2].text, "2");
  const empty = await render({ ...estimate, lines: [{ ...line, characteristics: [], characteristicGroups: [] }] });
  assert.ok(JSON.stringify(empty).includes("Характеристики требуют уточнения"));
  const renderWithImage = new Function("pdfMock", "loadEstimatePdfImages", "workingHoursText", `${code};loadBrandLogo=async()=>null;return createChimneyEstimatePdf;`)(
    {createPdf:definition=>definition}, async()=>["data:image/png;base64,LOCAL-TEST"], "Local test",
  );
  const pictured = await renderWithImage({ ...estimate, lines: [line] });
  assert.equal(pictured.images.product0, "data:image/png;base64,LOCAL-TEST");
  const imageCell = pictured.content.find(item => item.table?.widths?.length === 5).table.body[1][1].columns[0];
  assert.equal(imageCell.image, "product0");
  assert.deepEqual(imageCell.fit, [36, 42]);
  assert.ok(!JSON.stringify(pictured).includes("Фото уточняется"));
});

test("restored template generates a real PDF using the existing pdfmake engine", async () => {
  const pdfMake = (await import("pdfmake/build/pdfmake.js")).default;
  const fonts = (await import("pdfmake/build/vfs_fonts.js")).default;
  pdfMake.addVirtualFileSystem(fonts);
  const definition = await render({ ...estimate, lines: [{
    key: "real-pdf", label: "Труба", skuName: "Каталожная труба", article: "TEST-PDF",
    characteristics: ["Ø115 мм", "1000 мм"], quantity: 1, unitPriceRub: 123.45,
    lineTotalRub: 123.45, matchStatus: "exact", note: "",
  }], totalUnits: 1, knownSubtotalRub: 123.45 });
  const buffer = await new Promise(resolve => pdfMake.createPdf(definition).getBuffer(resolve));
  assert.equal(Buffer.from(buffer).subarray(0, 5).toString(), "%PDF-");
  assert.ok(buffer.length > 10000);
});
