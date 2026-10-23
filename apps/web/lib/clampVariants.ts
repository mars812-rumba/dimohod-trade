import type { Product, SKU } from "./api";

export function isDiameterClampProduct(product: Pick<Product, "slug">): boolean {
  return ["odnostennyi-krepezh-homut-shirokii", "odnostennyi-krepezh-homut-silovoi"].includes(product.slug);
}

function text(value: string | null | undefined): string {
  return (value ?? "").trim().toLocaleLowerCase("ru-RU");
}

function dimension(value: number | string | null | undefined): number | null {
  return value === null || value === undefined ? null : Number(String(value).replace(",", "."));
}

/** A diameter edit must not substitute steel/material, thickness or execution. */
export function clampDiameterVariants(variants: readonly SKU[], current: SKU): SKU[] {
  return variants.filter(sku => sku.diameter_mm !== null
    && text(sku.material) === text(current.material)
    && text(sku.steel_grade) === text(current.steel_grade)
    && text(sku.contour) === text(current.contour)
    && dimension(sku.wall_thickness_mm) === dimension(current.wall_thickness_mm)
    && sku.outer_diameter_mm === current.outer_diameter_mm
    && sku.length_mm === current.length_mm && sku.angle_deg === current.angle_deg
    && sku.insulation_mm === current.insulation_mm
    && sku.attributes.execution === current.attributes.execution
    && sku.attributes.base_size === current.attributes.base_size);
}
