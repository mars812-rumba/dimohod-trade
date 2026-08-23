import assert from "node:assert/strict";
import test from "node:test";
import { documentsForSku } from "./productDocuments.ts";

const product = {
  material: null,
  steel_grade: null,
  contour: null,
};

function sku(overrides = {}) {
  return {
    material: "Нержавеющая сталь",
    steel_grade: "AISI 304",
    contour: "Сэндвич",
    attributes: {},
    ...overrides,
  };
}

test("shows the general certificate and AISI 304 reference documents", () => {
  const documents = documentsForSku(product, sku());

  assert.deepEqual(
    documents.map((document) => document.id),
    [
      "modular-chimneys-conformity-2024-2027",
      "mill-test-aisi-304-2011",
      "inspection-s189-aisi-304-2012-page-1",
    ],
  );
  assert.match(documents[2].note, /только первая страница/i);
});

test("matches a reference document to outer AISI 430 steel", () => {
  const documents = documentsForSku(
    product,
    sku({
      steel_grade: "AISI 316",
      attributes: {
        outer_material: "stainless",
        outer_steel_grade: "AISI 430",
      },
    }),
  );

  assert.deepEqual(
    documents.map((document) => document.id),
    ["modular-chimneys-conformity-2024-2027", "inspection-aisi-430-2012"],
  );
});

test("does not show stainless documents for a galvanized non-chimney SKU", () => {
  const documents = documentsForSku(
    product,
    sku({
      material: "Оцинкованная сталь",
      steel_grade: null,
      contour: "Крепёж",
    }),
  );

  assert.deepEqual(documents, []);
});

test("labels old material documents as batch references", () => {
  const documents = documentsForSku(product, sku({ steel_grade: "AISI 430" }));
  const materialDocument = documents.find((document) => document.kind === "material-reference");

  assert.ok(materialDocument);
  assert.match(materialDocument.status, /справочный документ партии/i);
  assert.match(materialDocument.note, /не подтверждает происхождение выбранного SKU/i);
});
