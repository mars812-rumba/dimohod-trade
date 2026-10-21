import assert from "node:assert/strict";
import test from "node:test";
import { flangeExecutionVariant } from "./flangeVariants.ts";

const direct = { id: "straight", material: "нержавеющая сталь", steel_grade: "AISI 430", wall_thickness_mm: "0.5", diameter_mm: null, outer_diameter_mm: null, attributes: { base_size: "600×750 мм", execution: "Прямой" } };
const angled = { ...direct, id: "angled", attributes: { ...direct.attributes, execution: "Под углом" } };

test("flange checkbox switches both ways without changing size or steel", () => {
  assert.equal(flangeExecutionVariant([direct, angled], direct, true), angled);
  assert.equal(flangeExecutionVariant([direct, angled], angled, false), direct);
  assert.equal(flangeExecutionVariant([direct], direct, true), null);
});

test("flange checkbox does not silently substitute size, material, thickness or geometry", () => {
  for (const different of [
    { ...angled, attributes: { ...angled.attributes, base_size: "600×600 мм" } },
    { ...angled, material: "оцинкованная сталь" },
    { ...angled, steel_grade: "AISI 304" },
    { ...angled, wall_thickness_mm: "0.8" },
    { ...angled, diameter_mm: 200 },
    { ...angled, outer_diameter_mm: 300 },
  ]) assert.equal(flangeExecutionVariant([direct, different], direct, true), null);
});
