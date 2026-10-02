import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { catalogCategoryPath, normalizeCatalogFilters } from "./catalogFilters.ts";

const source = await readFile(new URL("./catalogSeoPages.ts", import.meta.url), "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
new Function("require", "module", "exports", transpiled)(
  (specifier) => {
    if (specifier === "./catalogFilters") return { catalogCategoryPath, normalizeCatalogFilters };
    throw new Error(`Unexpected import: ${specifier}`);
  },
  module,
  module.exports,
);
const {
  catalogSeoPagePath,
  catalogSeoPages,
  getCatalogSeoPage,
  validateCatalogSeoPages,
} = module.exports;

const approvedPage = {
  slug: "d100-200-aisi-304",
  category: "sendvich-truby",
  filters: { diameter: "100:200", inner_pipe: "stainless|AISI 304" },
  h1: "Подтверждённый H1",
  title: "Подтверждённый title",
  description: "Подтверждённое описание",
  intro: "Подтверждённый вводный текст",
  indexable: true,
};

test("keeps the production whitelist empty until pages are approved", () => {
  assert.deepEqual(catalogSeoPages, []);
  assert.equal(getCatalogSeoPage("sendvich-truby", "not-approved"), null);
});

test("validates an approved whitelist entry and builds its stable path", () => {
  assert.doesNotThrow(() => validateCatalogSeoPages([approvedPage]));
  assert.equal(
    catalogSeoPagePath(approvedPage),
    "/catalog/sendvich-truby/d100-200-aisi-304",
  );
});

test("rejects duplicate, malformed and invalid whitelist entries", () => {
  assert.throws(() => validateCatalogSeoPages([approvedPage, approvedPage]), /Duplicate/);
  assert.throws(
    () => validateCatalogSeoPages([{ ...approvedPage, slug: "../unsafe" }]),
    /Invalid catalog SEO slug/,
  );
  assert.throws(
    () => validateCatalogSeoPages([{ ...approvedPage, filters: { length: "-1" } }]),
    /Invalid filters/,
  );
  assert.throws(
    () => validateCatalogSeoPages([{ ...approvedPage, filters: { page: "2" } }]),
    /Invalid filters/,
  );
  assert.throws(
    () => validateCatalogSeoPages([{ ...approvedPage, filters: {} }]),
    /Invalid filters/,
  );
});
