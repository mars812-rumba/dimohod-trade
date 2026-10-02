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
