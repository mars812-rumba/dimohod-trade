import assert from "node:assert/strict";
import test from "node:test";

import { ensureDiameterInTitle } from "./productMetadata.ts";

test("adds a single-wall diameter to a fixed family title", () => {
  assert.equal(
    ensureDiameterInTitle(
      "Одноконтурная труба Дымоход Трейд для стартового участка",
      "Одноконтурная труба Дымоход Трейд для стартового участка",
      { diameter_mm: 150, outer_diameter_mm: null },
    ),
    "Одноконтурная труба Дымоход Трейд для стартового участка — 150 мм",
  );
});

test("adds a sandwich diameter before the brand suffix", () => {
  assert.equal(
    ensureDiameterInTitle(
      "Сэндвич-отвод 90° — купить | Дымоход Трейд",
      "Сэндвич-отвод 90° — купить | Дымоход Трейд",
      { diameter_mm: 150, outer_diameter_mm: 250 },
    ),
    "Сэндвич-отвод 90° 150×250 мм — купить | Дымоход Трейд",
  );
});

test("does not duplicate a rendered diameter variable", () => {
  assert.equal(
    ensureDiameterInTitle(
      "Сэндвич-тройник 90° {diameter} — купить | Дымоход Трейд",
      "Сэндвич-тройник 90° 100×200 мм — купить | Дымоход Трейд",
      { diameter_mm: 100, outer_diameter_mm: 200 },
    ),
    "Сэндвич-тройник 90° 100×200 мм — купить | Дымоход Трейд",
  );
});

test("keeps an explicitly rendered diameter unchanged", () => {
  assert.equal(
    ensureDiameterInTitle(
      "Одноконтурный шибер Ø150 мм — купить | Дымоход Трейд",
      "Одноконтурный шибер Ø150 мм — купить | Дымоход Трейд",
      { diameter_mm: 150, outer_diameter_mm: null },
    ),
    "Одноконтурный шибер Ø150 мм — купить | Дымоход Трейд",
  );
});
