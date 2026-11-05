import type { SKU } from "./api";

export function flangeMaterialLabel(sku: SKU): string {
  return sku.steel_grade?.trim() || sku.material?.trim() || "Материал не указан";
}

export function flangeMaterialVariants(variants: readonly SKU[], current: SKU): SKU[] {
  return variants.filter(sku => sku.attributes.execution === current.attributes.execution
    && sku.attributes.base_size === current.attributes.base_size
    && sku.diameter_mm === current.diameter_mm && sku.outer_diameter_mm === current.outer_diameter_mm
    && sku.length_mm === current.length_mm && sku.angle_deg === current.angle_deg
    && sku.insulation_mm === current.insulation_mm
    && Number(sku.wall_thickness_mm) === Number(current.wall_thickness_mm));
}

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
