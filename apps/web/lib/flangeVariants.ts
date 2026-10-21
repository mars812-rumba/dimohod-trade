import type { SKU } from "./api";

/** Switch only the execution: do not silently change size, material or geometry. */
export function flangeExecutionVariant(variants: SKU[], current: SKU, angled: boolean): SKU | null {
  const execution = angled ? "Под углом" : "Прямой";
  return variants.find(sku => sku.attributes.execution === execution
    && sku.attributes.base_size === current.attributes.base_size
    && sku.material === current.material && sku.steel_grade === current.steel_grade
    && Number(sku.wall_thickness_mm) === Number(current.wall_thickness_mm)
    && sku.diameter_mm === current.diameter_mm && sku.outer_diameter_mm === current.outer_diameter_mm
  ) ?? null;
}
