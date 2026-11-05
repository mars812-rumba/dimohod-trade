import assert from "node:assert/strict";
import test from "node:test";
import { flangeMaterialVariants } from "./flangeVariants.ts";
import { estimatePickerVariants } from "./clampVariants.ts";

test("a clamp is selected by the actual outer diameter without a nearest-size fallback", () => {
  const a = { id: "a", diameter_mm: 220, outer_diameter_mm: null, attributes: {} };
  const b = { ...a, id: "b", diameter_mm: 280 };
  const product = { slug: "odnostennyi-krepezh-homut-silovoi", skus: [a, b] };
  assert.deepEqual(estimatePickerVariants(product, { diameter: 180, outer: 280 }), [b]);
  assert.deepEqual(estimatePickerVariants(product, { diameter: 115, outer: 215 }), []);
});

test("flange material choices preserve size and execution", () => {
  const current = { id: "a", diameter_mm: null, outer_diameter_mm: null, length_mm: null,
    angle_deg: null, insulation_mm: null, wall_thickness_mm: null,
    material: "нержавеющая сталь", steel_grade: "AISI 430",
    attributes: { base_size: "600×750 мм", execution: "Под углом" } };
  const material = { ...current, id: "b", steel_grade: "AISI 304" };
  const different = { ...material, id: "c", attributes: { ...material.attributes, base_size: "600×600 мм" } };
  const straight = { ...material, id: "d", attributes: { ...material.attributes, execution: "Прямой" } };
  assert.deepEqual(flangeMaterialVariants([current, material, different, straight], current), [current, material]);
});
