import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const source = await readFile(new URL("../components/ReadyKitLineDetails.tsx", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React,
} }).outputText.replace(/^import .*;\n/gmu, "").replace(/\bexport\s+/gu, "");
const icon = () => React.createElement("svg", { "aria-hidden": true });
const component = new Function("React", "Link", "Circle", "CircleDot", "Cylinder", "Hash", "Layers3", "Ruler", "productSelectionPath", "ReadyKitThumbnail", "styles", `${code};return ReadyKitLineDetails;`)(
  React, ({ children, ...props }) => React.createElement("a", props, children),
  icon, icon, icon, icon, icon, icon, () => "/product/existing-sku",
  ({ href, name }) => React.createElement("a", { href, "data-thumbnail": true }, name),
  new Proxy({}, { get: (_, key) => String(key) }),
);
const render = line => renderToStaticMarkup(React.createElement(component, { line }));
const line = {
  sku_id: "existing-sku", product_slug: "existing", label: "Сэндвич-труба", sku_name: "Полное каталожное наименование",
  article: "REAL-115", quantity: 3, unit_price_rub: "123.45", line_total_rub: "370.35",
  primary_image: null, characteristics: ["Ø115/215 мм", "1000 мм"],
  characteristic_groups: [
    { kind: "inner", title: "Внутренняя труба", fields: [{ key: "steel", label: "Сталь", value: "AISI 304" }] },
    { kind: "outer", title: "Наружная оболочка", fields: [{ key: "steel", label: "Сталь", value: "AISI 430" }] },
  ],
};

test("kit row starts compact and keeps the complete server-rendered details closed", () => {
  const before = structuredClone(line);
  const html = render(line);
  assert.match(html, /data-thumbnail="true"/);
  assert.match(html, /Арт\. REAL-115/);
  assert.match(html, /data-spec-summary="true">Ø115\/215 мм · 1000 мм/);
  const [initial, details] = html.split('<details class="itemDisclosure">');
  assert.ok(details, "native details are closed by default");
  assert.ok(!initial.includes("Полное каталожное наименование"));
  assert.ok(!initial.includes("itemGroups"));
  for (const text of ["Все характеристики", "Полное каталожное наименование", "Внутренняя труба", "Наружная оболочка", "AISI 304", "AISI 430"]) assert.ok(details.includes(text), text);
  assert.deepEqual(line, before, "presentation must not change SKU, quantity or prices");
  assert.ok(!source.includes('"use client"'));
});

test("short characteristics fall back only to available structured facts", () => {
  const html = render({ ...line, characteristics: [] });
  assert.match(html, /data-spec-summary="true">Сталь: AISI 304 · Сталь: AISI 430/);
  assert.ok(!html.includes("50 мм"));
  assert.ok(!html.includes("0,5 мм"));
});

test("legacy flat parameters remain available without invented layer sections", () => {
  const html = render({ ...line, characteristic_groups: [] });
  assert.match(html, /Все характеристики/);
  assert.match(html, /Ø115\/215 мм · 1000 мм/);
  assert.ok(!html.includes("data-spec-group"));
});
