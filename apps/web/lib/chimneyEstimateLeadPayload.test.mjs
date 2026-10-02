import assert from "node:assert/strict";
import test from "node:test";

import { chimneyEstimateLeadPayload } from "./chimneyEstimate.ts";

test("lead BOM payload contains only fields accepted by the backend contract", () => {
  const payload = chimneyEstimateLeadPayload({
    reference: "DT-TEST",
    revision: 2,
    customer: {
      name: "Марсель",
      contactMethod: "phone",
      contact: "+7 999 000-00-00",
    },
    profileName: "Быстрый предварительный расчёт",
    generatedAt: new Date("2026-10-02T12:00:00.000Z"),
    measurements: [{ label: "Объект", value: "Дом" }],
    lines: [{
      key: "pipe",
      skuId: null,
      label: "Сэндвич-труба",
      article: null,
      skuName: null,
      quantity: 1,
      unitPriceRub: 1000,
      lineTotalRub: 1000,
      characteristics: ["AISI 430"],
      note: "",
      matchStatus: "missing",
    }],
    knownSubtotalRub: 1000,
    pricedLineCount: 1,
    unpricedLineCount: 0,
    totalUnits: 1,
    removedLabels: [],
    reviewItems: [],
    calculationErrors: [],
  }, "https://dimohod-trade.pro/bystryy-raschet");

  assert.deepEqual(Object.keys(payload).sort(), [
    "calculationErrors",
    "generatedAt",
    "knownSubtotalRub",
    "lines",
    "measurements",
    "pricedLineCount",
    "profileName",
    "removedLabels",
    "reviewItems",
    "schemaVersion",
    "sourceUrl",
    "totalUnits",
    "unpricedLineCount",
  ].sort());
  assert.equal("customer" in payload, false);
  assert.equal("reference" in payload, false);
  assert.equal("revision" in payload, false);
});

test("lead BOM payload normalizes catalog data to the strict backend limits", () => {
  const payload = chimneyEstimateLeadPayload({
    profileName: ` Расчёт ${"x".repeat(220)} `,
    generatedAt: new Date("2026-10-02T12:00:00.000Z"),
    measurements: [
      { label: ` Параметр ${"x".repeat(200)}`, value: ` Значение ${"x".repeat(280)}` },
      { label: "", value: "пустая строка должна быть исключена" },
    ],
    lines: [{
      key: "valid-line",
      skuId: "not-a-uuid",
      label: ` Позиция ${"x".repeat(260)}`,
      article: "a".repeat(140),
      skuName: "n".repeat(240),
      quantity: 2.9,
      unitPriceRub: Number.NaN,
      lineTotalRub: 2500,
      characteristics: Array.from({ length: 35 }, (_, index) => `свойство ${index}`),
      note: "n".repeat(4100),
      matchStatus: "manual",
    }, {
      key: "zero-line",
      skuId: null,
      label: "Нулевая строка",
      article: null,
      skuName: null,
      quantity: 0,
      unitPriceRub: null,
      lineTotalRub: null,
      characteristics: [],
      note: "",
      matchStatus: "missing",
    }],
    knownSubtotalRub: Number.NaN,
    pricedLineCount: 99,
    unpricedLineCount: 99,
    totalUnits: 0,
    removedLabels: [],
    reviewItems: [],
    calculationErrors: [],
  }, ` https://example.test/${"x".repeat(1100)} `);

  assert.equal(payload.profileName.length, 180);
  assert.equal(payload.sourceUrl.length, 1000);
  assert.equal(payload.measurements.length, 1);
  assert.equal(payload.measurements[0].label.length, 180);
  assert.equal(payload.measurements[0].value.length, 240);
  assert.equal(payload.lines.length, 1);
  assert.equal(payload.lines[0].skuId, null);
  assert.equal(payload.lines[0].label.length, 240);
  assert.equal(payload.lines[0].article?.length, 120);
  assert.equal(payload.lines[0].skuName?.length, 220);
  assert.equal(payload.lines[0].quantity, 2);
  assert.equal(payload.lines[0].unitPriceRub, null);
  assert.equal(payload.lines[0].characteristics.length, 30);
  assert.equal(payload.lines[0].note.length, 4000);
  assert.equal(payload.lines[0].matchStatus, "missing");
  assert.equal(payload.knownSubtotalRub, 2500);
  assert.equal(payload.pricedLineCount, 1);
  assert.equal(payload.unpricedLineCount, 0);
  assert.equal(payload.totalUnits, 2);
});
