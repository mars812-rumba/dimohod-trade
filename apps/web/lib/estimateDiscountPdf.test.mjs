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

test("structured PDF separates layers, preserves amounts and uses a missing-photo placeholder", async () => {
  const line = { key: "pipe", label: "Сэндвич-труба", skuName: "Из каталога", article: "REAL", quantity: 2,
    unitPriceRub: 123.45, lineTotalRub: 246.9, matchStatus: "exact", characteristics: ["Legacy flat text"], note: "Не потерять примечание",
    characteristicGroups: [
      { kind: "inner", title: "Внутренняя труба", fields: [{ label: "Сталь", value: "AISI 304" }, { label: "Толщина", value: "0,8 мм" }] },
      { kind: "outer", title: "Наружная оболочка", fields: [{ label: "Сталь", value: "AISI 430" }, { label: "Толщина", value: "0,5 мм" }] },
    ] };
  const doc = await render({ ...estimate, lines: [line], totalUnits: 2, knownSubtotalRub: 246.9 });
  const text = JSON.stringify(doc);
  for (const fragment of ["Внутренняя труба", "Наружная оболочка", "AISI 304", "AISI 430", "0,8 мм", "0,5 мм", "Фото уточняется", "Не потерять примечание", "123,45", "246,9"]) assert.ok(text.includes(fragment), fragment);
  assert.ok(!text.includes("Legacy flat text"));
  const legacy = await render({ ...estimate, lines: [{ ...line, characteristicGroups: undefined }] });
  assert.ok(JSON.stringify(legacy).includes("Legacy flat text"));
  const empty = await render({ ...estimate, lines: [{ ...line, characteristics: [], characteristicGroups: [] }] });
  assert.ok(!JSON.stringify(empty).includes("Характеристики требуют уточнения"));
  assert.ok(JSON.stringify(empty).includes("Фото уточняется"));
  const renderWithImage = new Function("pdfMock", "loadEstimatePdfImages", "workingHoursText", `${code};loadBrandLogo=async()=>null;return createChimneyEstimatePdf;`)(
    {createPdf:definition=>definition}, async()=>["data:image/png;base64,LOCAL-TEST"], "Local test",
  );
  const pictured = await renderWithImage({ ...estimate, lines: [line] });
  assert.equal(pictured.images.product0, "data:image/png;base64,LOCAL-TEST");
  assert.ok(!JSON.stringify(pictured).includes("Фото уточняется"));
});
