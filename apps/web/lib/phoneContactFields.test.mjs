import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { CONTACT_METHOD_OPTIONS } from "./quickEstimateLead.ts";

const read = name => readFile(new URL(name, import.meta.url), "utf8");

test("all public contact selectors share phone, MAX and WhatsApp with a telephone input", async () => {
  const source = await read("../components/PhoneContactFields.tsx");
  const code = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.React,
  } }).outputText.replace(/^import .*;\n/gmu, "").replace(/\bexport\s+/gu, "");
  const Component = new Function("React", "useId", "useState", "CONTACT_METHOD_OPTIONS", "styles", `${code};return PhoneContactFields;`)(React, React.useId, React.useState, CONTACT_METHOD_OPTIONS, {});
  const html = renderToStaticMarkup(React.createElement(Component));
  for (const { value, label } of CONTACT_METHOD_OPTIONS) assert.ok(html.includes(`value="${value}"`) && html.includes(label));
  assert.equal((html.match(/<option/g) || []).length, 3);
  assert.ok(html.includes('name="contact"') && html.includes('type="tel"') && html.includes('inputMode="tel"'));
  assert.ok(!/telegram|@username|type="email"|value="email"/i.test(html));
  for (const file of ["QuickEstimateContactForm", "ReadyKitControls", "EstimateLeadDialog", "LeadForm"]) {
    const form = await read(`../components/${file}.tsx`);
    assert.ok(form.includes("<PhoneContactFields"), file);
    assert.ok(form.includes("quickEstimateContact"), file);
    assert.ok(!/Telegram|@username|value="email"|value="telegram"|При выборе email/.test(form), file);
  }
});
