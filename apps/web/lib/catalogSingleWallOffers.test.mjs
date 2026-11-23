import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const read = name => readFile(new URL(name, import.meta.url), "utf8");
const compile = source => ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React,
} }).outputText.replace(/^import .*;\n/gmu, "").replace(/\bexport\s+/gu, "");
const source = await read("./catalogSingleWallOffers.ts");
const load = getProducts => new Function("getProducts", `${compile(source)};return {getSingleWallOffers,splitSingleWallDescription};`)(getProducts);
const offer = (diameter, changes = {}) => ({
  category: { slug: "odnokonturnye-truby" }, slug: "odnostennyi-truba", product_kind: "труба",
  contour: "одностенный", diameter_mm: diameter, outer_diameter_mm: null, length_mm: 1000,
  steel_grade: "AISI 304", wall_thickness_mm: "0.50", material: "нержавеющая сталь",
  selected_sku: `REAL-${diameter}`, selected_sku_id: `id-${diameter}`, price_rub: "1390.24", ...changes,
});

test("server requests the exact execution, retaining current selected SKU and price", async () => {
  const requests = [];
  const { getSingleWallOffers } = load(async options => {
    requests.push(options);
    const diameter = Number(options.diameter.split(":")[0]);
    return { items: [offer(diameter)], total: 1 };
  });
  const offers = await getSingleWallOffers();
  assert.deepEqual(offers.map(item => item.diameter_mm), [100, 115, 120, 150]);
  for (const options of requests) assert.deepEqual({ ...options, diameter: undefined }, {
    category: "odnokonturnye-truby", productKind: "труба", contour: "одностенный",
    diameter: undefined, length: "1000", steelGrade: "AISI 304", material: "stainless", wallThickness: "0.5",
  });
  assert.equal(offers[1].selected_sku, "REAL-115");
  assert.equal(offers[1].price_rub, "1390.24");
});

test("missing or mismatching executions are omitted without a family/diameter fallback", async () => {
  const mismatches = [
    { length_mm: 750 }, { diameter_mm: 180 }, { outer_diameter_mm: 215 },
    { steel_grade: "AISI 430" }, { wall_thickness_mm: "0.8" },
    { material: "оцинковка" }, { contour: "сэндвич" }, { product_kind: "отвод" },
    { category: { slug: "sendvich-truby" } }, { selected_sku: null }, { selected_sku_id: null },
  ];
  for (const changes of mismatches) {
    const { getSingleWallOffers } = load(async options => ({ items: [offer(Number(options.diameter.split(":")[0]), changes)] }));
    assert.deepEqual(await getSingleWallOffers(), [], JSON.stringify(changes));
  }
  const { getSingleWallOffers } = load(async options => ({ items: options.diameter === "115:" ? [] : [offer(Number(options.diameter.split(":")[0]))] }));
  assert.deepEqual((await getSingleWallOffers()).map(item => item.diameter_mm), [100, 120, 150]);
});

test("an unavailable offer does not prevent other rows or the category from rendering", async () => {
  const { getSingleWallOffers } = load(async options => {
    if (options.diameter === "120:") throw new Error("Public API unavailable");
    return { items: [offer(Number(options.diameter.split(":")[0]))] };
  });
  assert.deepEqual((await getSingleWallOffers()).map(item => item.diameter_mm), [100, 115, 150]);
  assert.deepEqual(await load(async () => { throw new Error("offline"); }).getSingleWallOffers(), []);
});

test("description moves intact after two sentences, without splitting decimal parameters", () => {
  const { splitSingleWallDescription } = load(null);
  const text = "Длина 1000 мм. Толщина 0.5 мм. Третье предложение. Последнее предложение.";
  assert.deepEqual(splitSingleWallDescription(text), {
    intro: "Длина 1000 мм. Толщина 0.5 мм.", remainder: "Третье предложение. Последнее предложение.",
  });
  assert.deepEqual(splitSingleWallDescription("Только одно предложение."), { intro: "Только одно предложение.", remainder: "" });
  assert.deepEqual(splitSingleWallDescription(null), { intro: "", remainder: "" });
});

test("table renders three columns and plain exact-SKU anchors in server HTML", async () => {
  const urls = await read("./productUrls.ts");
  const productSelectionPath = new Function(`${compile(urls)};return productSelectionPath;`)();
  const component = await read("../components/CatalogSingleWallOffers.tsx");
  const styles = new Proxy({}, { get: (_, key) => String(key) });
  const render = async offers => {
    const Component = new Function("React", "getSingleWallOffers", "productSelectionPath", "styles", `${compile(component)};return CatalogSingleWallOffers;`)(React, async () => offers, productSelectionPath, styles);
    return renderToStaticMarkup(await Component());
  };
  const html = await render([offer(100), offer(115)]);
  assert.equal((html.match(/<th scope="col"/g) ?? []).length, 3);
  assert.equal((html.match(/Длина 1000 мм · сталь AISI 304 · толщина 0,5 мм/g) ?? []).length, 1);
  assert.ok(html.includes('href="/product/odnostennyi-truba-d115?sku=REAL-115&amp;length=1000"'));
  assert.ok(html.includes('Открыть →</a>'));
  assert.ok(html.includes(new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(1390.24)));
  assert.equal(await render([]), "");
  assert.ok((await render([offer(100, { price_rub: null })])).includes("Цена по запросу"));
});
